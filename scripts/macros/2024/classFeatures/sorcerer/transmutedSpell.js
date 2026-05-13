import {actorUtils, dialogUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

function getDamageTypes(item) {
    let activities = Array.from(item.system.activities.getByTypes('attack', 'damage', 'save'));
    let flavorTypes = new Set(activities.flatMap(a => a.damage.parts.flatMap(d => new Roll(d.formula).terms.map(i => i.flavor).filter(i => i))));
    let trueTypes = new Set(activities.flatMap(a => a.damage.parts.flatMap(d => Array.from(d.types))));
    let allTypes = flavorTypes.union(trueTypes);
    return allTypes;
}

function createUpdateItem(item, oldDamageType, newDamageType) {
    let activities = Array.from(item.system.activities.getByTypes('attack', 'damage', 'save')).filter(a => {
        if (a.damage.parts.some(d => new Roll(d.formula).terms.some(i => i.flavor === oldDamageType))) return true;
        if (a.damage.parts.some(d => d.types.has(oldDamageType))) return true;
        return false;
    });
    let activityUpdates = {};
    for (let activity of activities) {
        activityUpdates[activity.id] = {
            damage: {
                parts: activity.damage.parts.map(i => {
                    let newPart = {};
                    if (i.custom.enabled) newPart.custom = {formula: i.custom.formula.replaceAll(oldDamageType, newDamageType), enabled: true};
                    if (i.types.has(oldDamageType)) newPart.types = [newDamageType];
                    return {...i, ...newPart};
                })
            }
        };
    }
    return {
        system: {
            activities: activityUpdates
        }
    };
}

async function useTransmuted({workflow}) {
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    if (!sorcPoints?.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.NotEnough', 'info');
        return;
    }
    let damageTypes = ['acid', 'cold', 'fire', 'lightning', 'poison', 'thunder'];
    let validSpells = actorUtils.getCastableSpells(workflow.actor).filter(i => damageTypes.some(j => getDamageTypes(i).has(j)));
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
    let replacementOptions = Array.from(getDamageTypes(selection).intersection(new Set(damageTypes)));
    let damageTypeToChange;
    if (replacementOptions.length > 1) {
        let selection2 = await dialogUtils.buttonDialog(selection.name, 'CHRISPREMADES.Macros.Metamagic.TransmutedFirst', replacementOptions.map(i => ['DND5E.Damage' + i.capitalize(), i]));
        if (selection2) damageTypeToChange = selection2;
    }
    if (!damageTypeToChange) damageTypeToChange = replacementOptions[0];
    let newDamageTypes = damageTypes.filter(i => i !== damageTypeToChange);
    let newDamageType = await dialogUtils.buttonDialog(selection.name, 'CHRISPREMADES.Macros.Metamagic.TransmutedSecond', newDamageTypes.map(i => ['DND5E.Damage' + i.capitalize(), i]));
    if (!newDamageType) newDamageType = newDamageTypes[0];
    let newItem = selection.clone(createUpdateItem(selection, damageTypeToChange, newDamageType), {keepId: true});
    await workflowUtils.completeItemUse(newItem);
}

export let transmutedSpell = {
    name: 'Metamagic: Transmuted Spell',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: useTransmuted,
                priority: 50
            }
        ]
    },
    ddbi: {
        removedItems: {
            'Metamagic: Transmuted Spell': [
                'Metamagic - Transmuted Spell'
            ]
        },
        correctedItems: {
            'Metamagic: Transmuted Spell': {
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
