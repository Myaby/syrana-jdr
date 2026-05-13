import {actorUtils, dialogUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

async function useSubtle({workflow}) {
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => ['vocal', 'verbal', 'somatic'].some(j => i.system.properties.has(j)));
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
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + 1});
    let newItem = selection.clone({'system.properties': Array.from(selection.system.properties.difference(new Set(['vocal', 'verbal', 'somatic'])))}, {keepId: true});
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

export let subtleSpell = {
    name: 'Metamagic: Subtle Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useSubtle,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Subtle Spell': [
                'Metamagic - Subtle Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Subtle Spell': {
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
