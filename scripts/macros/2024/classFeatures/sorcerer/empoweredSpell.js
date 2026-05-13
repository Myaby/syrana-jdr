import {DialogApp} from '../../../../applications/dialog.js';
import {genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

async function damageEmpowered({trigger: {entity: item}, workflow}) {
    if (!workflow.hitTargets.size || workflow.item.type !== 'spell') return;
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints?.system.uses.value) return;
    let max = workflow.actor.system.abilities.cha.mod;
    let newDamageRolls = workflow.damageRolls;
    let lowest = [];
    for (let a = 0; a < newDamageRolls.length; a++) {
        let newDamageRoll = newDamageRolls[a];
        for (let term = 0; term < newDamageRoll.terms.length; term++) {
            if (newDamageRoll.terms[term].isDeterministic === false) {
                let currentTerm = newDamageRoll.terms[term];
                let modifiers = currentTerm.modifiers?.toString();
                let flavor = currentTerm.flavor?.length ? currentTerm.flavor : newDamageRoll.options.type;
                let expression = currentTerm.expression;
                let results = [];
                for (let position = 0; position < currentTerm.values.length; position++) {
                    results.push(currentTerm.values[position]);
                }
                lowest.push({
                    roll: a,
                    results,
                    expression,
                    faces: currentTerm.faces,
                    term,
                    modifiers,
                    flavor
                });
            }
        }
    }
    let selection = await DialogApp.dialog(item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Empowered', {max}), [[
        'selectAmount',
        lowest.map(i => ({
            label: i.expression + (i.flavor ? '[' + i.flavor + ']: ' : ': ') + i.results.join(', '),
            name: i.roll + '-' + i.term,
            options: {
                minAmount: 0,
                maxAmount: Math.min(max, i.results.length)
            }
        })),
        {totalMax: max, displayAsRows: true}
    ]], 'yesNo');
    if (!selection?.buttons) return;
    let toReroll = Object.keys(selection).filter(i => i !== 'buttons' && Number(selection[i]) > 0);
    if (!toReroll.length) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    for (let curr of toReroll) {
        let [roll, term] = curr.split('-');
        let existingRoll = lowest.find(i => i.roll == roll && i.term == term);
        let numRerolls = selection[curr];
        let indList = [];
        for (let i = 1; i <= existingRoll.faces; i++) {
            for (let j = 0; j < existingRoll.results.length; j++) {
                if (existingRoll.results[j] == i) indList.push(j);
                if (indList.length == numRerolls) break;
            }
            if (indList.length == numRerolls) break;
        }
        let damageFormula = '1d' + existingRoll.faces + existingRoll.modifiers + (existingRoll.flavor?.length ? '[' + existingRoll.flavor + ']' : '');
        for (let i = 0; i < numRerolls; i++) {
            let currInd = indList[i];
            let newRoll = await new Roll(damageFormula, existingRoll.data, existingRoll.options).evaluate();
            newRoll.dice[0].results[0].hidden = true;
            await newRoll.toMessage({
                speaker: ChatMessage.implementation.getSpeaker({token: workflow.token}),
                flavor: genericUtils.format('CHRISPREMADES.Generic.Rerolling', {origDie: 'd' + existingRoll.faces, origResult: existingRoll.results[currInd]}),
                rollMode: game.settings.get('core', 'rollMode')
            });
            newDamageRolls[roll].terms[term].results[currInd].result = newRoll.total;
        }
    }
    await workflow.setDamageRolls(newDamageRolls);
}

export let empoweredSpell = {
    name: 'Metamagic: Empowered Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'damageRollComplete',
                macro: damageEmpowered,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Empowered Spell': [
                'Metamagic - Empowered Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Empowered Spell': {
                system: {
                    consume: {
                        amount: null,
                        target: '',
                        type: ''
                    }
                }
            }
        }
    }
};
