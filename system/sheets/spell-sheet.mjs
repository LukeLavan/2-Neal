import {TwoNItemSheet} from './item-sheet.mjs';

export class TwoNSpellSheet extends TwoNItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['TwoN', 'sheet', 'item'],
            width: 320,
            height: 480,
            tabs: [],
        });
    }

    async getData() {
        const data = await super.getData();

        data.data.levelChoices = {
            1: 1,
            2: 2,
            3: 3,
            4: 4,
            5: 5,
            6: 6,
            7: 7,
            8: 8,
            9: 9,
        };
        data.data.schoolChoices = {
            Alteration: 'Alteration',
            Abjuration: 'Abjuration',
            Conjuration: 'Conjuration',
            Divination: 'Divination',
            Enchantment: 'Enchantment',
            Illusion: 'Illusion',
            Invocation: 'Invocation',
            Necromancy: 'Necromancy',
        };

        data.data.materialsHTML = await TextEditor.enrichHTML(
            this.object.system.materials,
            {async: true}
        );

        data.data.descriptionHTML = await TextEditor.enrichHTML(
            this.object.system.description,
            {async: true}
        );

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.spell-lock').click(this._lockToggle.bind(this));
    }

    _lockToggle() {
        this.item.update({system: {locked: !this.item.system.locked}});
    }
}
