import {effectUtils, genericUtils, itemUtils, workflowUtils} from '../../../../utils.js';

const exceptions = ['banishment', 'charmPerson', 'fly', 'heroism', 'holdPerson'];

async function earlyTwinned({workflow}) {
    if (exceptions.includes(genericUtils.getIdentifier(workflow.item)) && workflow.castData.baseLevel !== workflowUtils.getCastLevel(workflow)) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.TwinnedUpcastTargets', 'info');
        if (workflow.dnd5eConsumptionConfig?.consumeSpellSlot) {
            let slotLevel = workflow.dnd5eConsumptionConfig.slotLevel;
            let key = 'system.spells.' + slotLevel + '.value';
            let currValue = genericUtils.getProperty(workflow.actor, key);
            await genericUtils.update(workflow.actor, {[key]: currValue + 1});
        }
        let concEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
        if (concEffect) await genericUtils.remove(concEffect);
        workflow.aborted = true;
        return;
    }
    let sorcPoints = itemUtils.getItemByIdentifier(workflow.actor, 'sorceryPoints');
    let cost = Math.max(1, workflowUtils.getCastLevel(workflow));
    if (!sorcPoints || cost > sorcPoints.system.uses.value) {
        genericUtils.notify('CHRISPREMADES.Macros.Metamagic.TwinnedUpcast', 'info');
        if (workflow.dnd5eConsumptionConfig?.consumeSpellSlot) {
            let slotLevel = workflow.dnd5eConsumptionConfig.slotLevel;
            let key = 'system.spells.' + slotLevel + '.value';
            let currValue = genericUtils.getProperty(workflow.actor, key);
            await genericUtils.update(workflow.actor, {[key]: currValue + 1});
        }
        let concEffect = effectUtils.getConcentrationEffect(workflow.actor, workflow.item);
        if (concEffect) await genericUtils.remove(concEffect);
        workflow.aborted = true;
        return;
    }
    await genericUtils.update(sorcPoints, {'system.uses.spent': sorcPoints.system.uses.spent + cost});
}

export let twinnedSpellAttack = {
    name: 'Metamagic: Twinned Spell Attack',
    version: '1.1.0',
    rules: 'modern',
    midi: {
        item: [
            {
                pass: 'preItemRoll',
                macro: earlyTwinned,
                priority: 50
            }
        ]
    }
};
