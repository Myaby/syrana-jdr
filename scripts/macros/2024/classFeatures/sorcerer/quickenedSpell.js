import {actorUtils, dialogUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

async function useQuickened({workflow}) {
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints || sorcPoints.system.uses.value < 2) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => i.system.activation.type === 'action');
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 2, plural: 's'}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 2});
    let newItem = selection.clone({'system.activation.type': 'bonus'}, {keepId: true});
    let shouldConsumeSlot = newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method);
    let shouldConsumeUsage = newItem.system.hasLimitedUses;
    workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        options: {
            configureDialog: (shouldConsumeSlot || shouldConsumeUsage) ? true : null
        }, config: {
            consumeSpellSlot: shouldConsumeSlot ? true : null,
            consumeUsage: shouldConsumeUsage ? true : null
        }
    });
}

export let quickenedSpell = {
    name: 'Metamagic: Quickened Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useQuickened,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Quickened Spell': [
                'Metamagic - Quickened Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Quickened Spell': {
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
