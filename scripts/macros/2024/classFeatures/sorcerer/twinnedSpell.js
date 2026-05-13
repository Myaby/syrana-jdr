import {actorUtils, dialogUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

const exceptions = ['banishment', 'charmPerson', 'fly', 'heroism', 'holdPerson'];

async function useTwinned({workflow}) {
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i =>
        (exceptions.includes(genericUtils.getIdentifier(i)) ||
        (i.system.target.affects.count === 1 && !i.system.target.template.count)) &&
        i.system.level <= sorcPoints.system.uses.value &&
        i.system.source.rules === '2014'
    );
    if (!validSpells.length) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NoValid', 'info');
        return;
    }
    validSpells = validSpells.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    validSpells = validSpells.sort((a, b) => a.system.level - b.system.level);
    let selection = await dialogUtils.selectDocumentDialog(workflow.item.name, genericUtils.format('CHRISPREMADES.Macros.Metamagic.Which', {cost: 'spell\'s level in', plural: 's (at least 1)'}), validSpells, {
        showSpellLevel: true,
        addNoneDocument: true
    });
    if (!selection) return;
    let existingMacro = selection.flags?.['chris-premades']?.macros?.midi?.item ?? [];
    existingMacro.push('twinnedSpellAttack');
    let newItem = selection.clone({'system.target.affects.count': 2, 'flags.chris-premades.macros.midi.item': existingMacro}, {keepId: true});
    let shouldConsumeSlot = newItem.system.level && !['atwill', 'innate', 'ritual'].includes(newItem.system.method);
    let shouldConsumeUsage = newItem.system.hasLimitedUses;
    await workflowUtils.syntheticItemRoll(newItem, Array.from(workflow.targets), {
        options: {
            configureDialog: (shouldConsumeSlot || shouldConsumeUsage) ? true : null
        }, config: {
            consumeSpellSlot: shouldConsumeSlot ? true : null,
            consumeUsage: shouldConsumeUsage ? true : null
        }
    });
}

export let twinnedSpell = {
    name: 'Metamagic: Twinned Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useTwinned,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Twinned Spell': [
                'Metamagic - Twinned Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Twinned Spell': {
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
