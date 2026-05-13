import {rollUtils} from '../utils.js';
async function use({trigger, workflow}) {
    console.log('--- Used! ---');
}
async function damage({trigger, workflow}) {
    console.log('--- Damage! ---');
}
export let test = {
    name: 'test',
    version: '0.12.0',
    midi: {
        item: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            },
            {
                pass: 'damageRollComplete',
                macro: damage,
                priority: 150
            }
        ]
    }
};
export let test2 = {
    name: 'test2',
    version: '0.12.0',
    midi: {
        actor: [
            {
                pass: 'rollFinished',
                macro: use,
                priority: 50
            }
        ]
    }
};

export let syranaTest = {
    identifier :'heightenedSpell',
    name: 'Metamagic: Heightened Spell',
    version: '1.1.0',
    rules: 'legacy',
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