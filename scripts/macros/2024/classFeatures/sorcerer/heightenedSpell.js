import {actorUtils, constants, dialogUtils, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

async function useHeightened({workflow}) {
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints || sorcPoints.system.uses.value < 3) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => i.hasSave);
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 3, plural: 's'}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    let effectData = {
        name: workflow.item.name,
        img: workflow.item.img,
        origin: workflow.item.uuid,
        flags: {
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    effectUtils.addMacro(effectData, 'midi.actor', ['heightenedSpell']);
    let effect = await effectUtils.createEffect(workflow.actor, effectData, {identifier: 'metamagic', rules: 'modern'});
    if (!effect) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 3});
    await workflowUtils.completeItemUse(selection);
    if (effect) await genericUtils.remove(effect);
}

async function earlyHeightened({trigger: {entity: effect}, workflow}) {
    if (!workflow.targets.size) return;
    let targets = Array.from(workflow.targets);
    targets = targets.filter(i => i.document.disposition !== workflow.token.document.disposition);
    let selection = await dialogUtils.selectTargetDialog(effect.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.HeightenedWhich'), targets);
    if (!selection?.length) return;
    selection = selection[0];
    let effectData = {
        name: effect.name,
        img: constants.tempConditionIcon,
        origin: effect.uuid,
        changes: [
            {
                key: 'flags.midi-qol.disadvantage.save.all',
                mode: 5,
                value: 1,
                priority: 20
            }
        ],
        flags: {
            dae: {
                specialDuration: [
                    'isSave'
                ]
            },
            'chris-premades': {
                effect: {
                    noAnimation: true
                }
            }
        }
    };
    await effectUtils.createEffect(selection.actor, effectData, {parentEntity: effect, rules: 'modern'});
}

export let heightenedSpell = {
    name: 'Metamagic: Heightened Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useHeightened,
                priority: 50
            }
        ],
        actor: [
            {
                pass: 'preambleComplete',
                macro: earlyHeightened,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Heightened Spell': [
                'Metamagic - Heightened Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Heightened Spell': {
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
