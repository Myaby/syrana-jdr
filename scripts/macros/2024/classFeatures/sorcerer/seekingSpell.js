import {dialogUtils, genericUtils, itemUtils} from '../../../../utils.js';

async function attackSeeking({trigger: {entity: item}, workflow}) {
    if (!workflow.targets.size || workflow.item.type !== 'spell') return;
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints || sorcPoints.system.uses.value < 2) return;
    let attackTotal = workflow.attackTotal;
    if (Array.from(workflow.targets).every(i => i.actor?.system.attributes.ac.value <= attackTotal)) return;
    let selection = await dialogUtils.confirm(item.name, genericUtils.format('CHRISPREMADES.Dialog.Missed', {attackTotal, itemName: item.name + '(2 ' + sorcPoints.name + ')'}));
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 2});
    let newAttackRoll = await new Roll(workflow.attackRoll.formula, workflow.attackRoll.data, workflow.attackRoll.options).evaluate();
    await workflow.setAttackRoll(newAttackRoll);
}

export let seekingSpell = {
    name: 'Metamagic: Seeking Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        actor: [
            {
                pass: 'postAttackRoll',
                macro: attackSeeking,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Seeking Spell': [
                'Metamagic - Seeking Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Seeking Spell': {
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
