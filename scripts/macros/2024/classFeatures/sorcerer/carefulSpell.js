import {DialogApp} from '../../../../applications/dialog.js';
import {actorUtils, dialogUtils, effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

async function useCareful({workflow}) {
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => i.hasSave);
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 1, plural: ''}), validSpells, {
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
    effectUtils.addMacro(effectData, 'midi.actor', ['carefulSpell']);
    let effect = await effectUtils.createEffect(workflow.actor, effectData, {identifier: 'metamagic', rules: 'modern'});
    if (!effect) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    await workflowUtils.completeItemUse(selection);
    if (effect) await genericUtils.remove(effect);
}

async function earlyCareful({trigger: {entity: effect}, workflow}) {
    if (!workflow.targets.size) return;
    let max = Math.max(1, workflow.actor.system.abilities.cha.mod ?? 0);
    let targets = Array.from(workflow.targets);
    let originItem = await effectUtils.getOriginItem(effect);
    if (!originItem) return;
    let allowEnemies = itemUtils.getConfig(originItem, 'allowEnemies');
    if (!allowEnemies) targets = targets.filter(i => i.document.disposition === workflow.token.document.disposition);
    let selection = await dialogUtils.selectTargetDialog(effect.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.CarefulWhich', {max}), targets, {
        type: 'multiple',
        maxAmount: max
    });
    if (!selection?.length) return;
    selection = selection[0];
    let effectData = {
        name: effect.name,
        img: effect.img,
        origin: effect.uuid,
        changes: [
            {
                key: 'flags.midi-qol.min.ability.save.all',
                mode: 5,
                value: 100,
                priority: 120
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
    for (let target of selection) {
        await effectUtils.createEffect(target.actor, effectData, {parentEntity: effect, rules: 'modern'});
    }
}

export let carefulSpell = {
    name: 'Metamagic: Careful Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useCareful,
                priority: 50
            }
        ],
        actor: [
            {
                pass: 'preambleComplete',
                macro: earlyCareful,
                priority: 50
            }
        ]
    },
    config: [
        {
            value: 'allowEnemies',
            label: 'CHRISPREMADES.Config.AllowEnemies',
            type: 'checkbox',
            category: 'mechanics',
            default: false
        }
    ],
    ddbi: {
        removedItems: {
            'Metamagic: Careful Spell': [
                'Metamagic - Careful Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Careful Spell': {
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
