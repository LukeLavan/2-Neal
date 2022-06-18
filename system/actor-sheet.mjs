export class TwoDotNealActorSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['twodotneal', 'sheet', 'actor'],
            template: 'systems/fvtt-2neal/templates/actor-sheet.html',
            width: 900,
            height: 700,
            tabs: [
                {
                    navSelector: '.primary-tabs',
                    contentSelector: '.primary-content',
                    initial: 'basic',
                },
                {
                    navSelector: '.gear-tabs',
                    contentSelector: '.gear-content',
                    initial: '+',
                },
            ],
        });
    }

    getData() {
        const context = super.getData();
        const actorData = context.actor.data;
        switch (actorData.type) {
            case 'pc':
                this._preparePCData(context);
                break;
        }
        context.rollData = context.actor.getRollData();
        return context;
    }

    _preparePCData(context) {
        context.alignmentChoices = {
            '(choose one)': '(choose one)',
            'Lawful Good': 'Lawful Good',
            'Lawful Neutral': 'Lawful Neutral',
            'Lawful Evil': 'Lawful Evil',
            'Neutral Good': 'Neutral Good',
            'Neutral Neutral': 'Neutral Neutral',
            'Neutral Evil': 'Neutral Evil',
            'Chaotic Good': 'Chaotic Good',
            'Chaotic Neutral': 'Chaotic Neutral',
            'Chaotic Evil': 'Chaotic Evil',
        };

        context.hitDieChoices = {
            d4: 'd4',
            d6: 'd6',
            d8: 'd8',
            d10: 'd10',
            d12: 'd12',
        };

        context.statChoices = {
            None: 'None',
            STR: 'STR',
            DEX: 'DEX',
            CON: 'CON',
            INT: 'INT',
            WIS: 'WIS',
            CHA: 'CHA',
            PER: 'PER',
        };

        context.attackTypeChoices = {
            '': '',
            Melee: 'Melee',
            Missile: 'Missile',
            Thrown: 'Thrown',
        };

        context.damageTypeChoices = {
            Bludgeoning: 'Bludgeoning',
            Slashing: 'Slashing',
            Piercing: 'Piercing',
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.rollable').click(this._rollRollable.bind(this));

        html.find('.item-create').click(this._itemCreate.bind(this));

        html.find('.item-edit').change((ev) => {
            const currentTarget = $(ev.currentTarget);
            const id = currentTarget.parents('.item').attr('data-item-id');
            const target = currentTarget.attr('data-target');
            let value = currentTarget.val();
            // ensure checkbox values are booleans
            if (currentTarget.attr('type') === 'checkbox') {
                if (currentTarget.is(':checked')) value = true;
                else value = false;
            }
            let itemDifferential = {_id: id};
            itemDifferential[target] = value;
            this.actor.updateEmbeddedDocuments('Item', [itemDifferential]);
        });

        html.find('.item-toggle').click((ev) => {
            const currentTarget = $(ev.currentTarget);
            const id = currentTarget.parents('.item').attr('data-item-id');
            const target = currentTarget.attr('data-target');
            let value = currentTarget.data('value');

            // toggle
            value = !value;

            let itemDifferential = {_id: id};
            itemDifferential[target] = value;
            let itemDifferentials = [itemDifferential];

            // toggling gearTab default on clears all tabs' default status first
            const defaultToggle = currentTarget.data('default');
            if (defaultToggle && value) {
                const actorData = this.object.data;
                actorData.data.gearTabs.forEach((_, key) => {
                    itemDifferentials.push({
                        _id: key,
                        'data.default': false,
                    });
                });
                // also set actor's defaultGearTab
                this.object.update({'data.defaultGearTab': id});
            }
            this.actor.updateEmbeddedDocuments('Item', itemDifferentials);
        });

        html.find('.item-delete').click((ev) => {
            const currentTarget = $(ev.currentTarget);
            const id = currentTarget.parents('.item').attr('data-item-id');
            const locked = currentTarget.data('locked');
            if (locked) return;
            this.actor.deleteEmbeddedDocuments('Item', [id]);
        });

        html.find('.item-open').click((ev) => {
            const currentTarget = $(ev.currentTarget);
            const id = currentTarget.parents('.item').attr('data-item-id');
            this.actor.data.items.get(id).sheet.render(true);
        });

        html.find('.tab-delete').click((ev) => {
            const currentTarget = $(ev.currentTarget);
            const id = currentTarget.parents('.item').attr('data-item-id');
            const locked = currentTarget.data('locked');
            if (locked) return;
            const itemsToDelete = [id];
            // also delete items in tab
            this.actor.items.forEach((item) => {
                if (item.type === 'gear' && item.data.data.tab === id)
                    itemsToDelete.push(item.id);
            });
            this.actor.deleteEmbeddedDocuments('Item', itemsToDelete);
        });

        html.find('.droppable').on('dragover', (element) => {
            element.currentTarget.classList.add('dragover');
        });
        html.find('.droppable').on('dragleave', (element) => {
            element.currentTarget.classList.remove('dragover');
        });

        // highlight active encumbrance
        const activeEncumbranceRow = html.find(
            '#encumbrance-' + this.actor.data.data.currentEncumbrance
        );
        if (activeEncumbranceRow[0])
            activeEncumbranceRow[0].className = 'encumbranceHighlight';
    }

    //TODO: better success/failure roll
    _rollRollable(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        if (dataset.roll) {
            let roll = new Roll(dataset.roll, this.actor.data.data);
            let label = dataset.label ? `Rolling ${dataset.label}` : '';
            roll.toMessage({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: label,
            });
        }
    }

    async _itemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const type = header.dataset.type;
        const data = duplicate(header.dataset);
        const itemName = type.capitalize();
        const itemData = {
            name: itemName,
            type: type,
            data: data,
        };
        const item = await Item.create(itemData, {parent: this.actor});
        const focusbox = document.getElementById(item.id + '.name');
        focusbox.focus();
        focusbox.select();
        return item;
    }

    async _onDropItem(dragEvent, data) {
        const item = await super._onDropItem(dragEvent, data);
        const actorData = this.object.data;
        if (item.type === 'gear') {
            let targetTab = actorData.data.defaultGearTab;
            // determine if dragtarget is a gearTab
            const path = dragEvent.path;
            for (let i = 0; i < path.length; ++i)
                if (path[i].classList?.contains('dragover')) {
                    targetTab = path[i].dataset.tab;
                    break;
                }
            item.update({'data.tab': targetTab});
        }
    }
}
