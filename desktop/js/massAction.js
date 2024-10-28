/* This file is part of Jeedom.
*
* Jeedom is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* Jeedom is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with Jeedom. If not, see <http://www.gnu.org/licenses/>.
*/

$(function () {

        const initModal = function (size, title, message, ajaxAction) {
            bootbox.confirm({
                title,
                message,
                size,
                buttons: {
                    confirm: {
                        label: 'Valider',
                        className: 'btn-success'
                    },
                    cancel: {
                        label: 'Annuler',
                        className: 'btn-danger'
                    }
                },
                onShown: async function () {
                    // initialize form on modal shown
                    await buildEquipementsSelect();
                    toggleCommandForm();

                    // bind change event on selects
                    $('#modalBrokerSelector, #modalParentObjectSelector').bind('change', async function () {
                        await buildEquipementsSelect();
                        toggleCommandForm();
                    });

                    $('#virtualName').bind('input', function () {
                        toggleCommandForm();
                    });
                },
                callback: function (result) {
                    if (!result) {
                        return;
                    }

                    const $acceptButton = $('.bootbox-accept');
                    const $cancelButton = $('.bootbox-cancel');
                    [$acceptButton, $cancelButton].forEach(button => {
                        button.attr('disabled', 'disabled');
                        button.addClass('disabled');
                    });
                    $acceptButton.html('Envoi en cours...');

                    const formData = new FormData(document.forms['ajaxForm']);
                    formData.append('action', ajaxAction);
                    $.ajax({
                        url: 'plugins/massAction/core/ajax/massAction.ajax.php',
                        type: 'POST',
                        data: formData,
                        async: false,
                        success: function (data) {
                            const returnData = JSON.parse(data);
                            if (returnData.state !== 'ok') {
                                $.fn.showAlert({message: returnData.result, level: 'error'});
                                [$acceptButton, $cancelButton].forEach(button => {
                                    button.removeAttr('disabled');
                                    button.removeClass('disabled');
                                });
                                $acceptButton.html('Valider');

                                return;
                            }
                            loadEquipmentsList();
                            $.fn.showAlert({message: 'Succès', level: 'success'});
                        },
                        cache: false,
                        contentType: false,
                        processData: false,
                    });
                }
            });
        };

        const buildBaseModal = function (brokerSelector, objectParent) {
            const selectedBroker = brokerSelector.val();
            const selectedObject = objectParent.val();

            let dialog_message = '';

            dialog_message += '<div class="row">';

            // Object parent selector
            dialog_message += '<div class="col-md-6">';
            dialog_message += '<label class="control-label">{{Objet parent}}</label>';
            dialog_message += '<select class="bootbox-input bootbox-input-select form-control" id="modalParentObjectSelector" name="parentObject">';
            dialog_message += '<option value="">{{Aucun}}</option>';
            $.each(objects, function (key, obj) {
                dialog_message += `<option value="${key}" ${selectedObject === key ? 'selected' : ''}>${'&nbsp;'.repeat(obj.parentNumber)} ${obj.name} </option>`;
            });
            dialog_message += '</select><br/>';
            dialog_message += '</div>'

            // Broker selector
            dialog_message += '<div class="col-md-6">';

            dialog_message += '<label class="control-label">{{Broker utilisé :}}</label> ';
            dialog_message += '<select class="bootbox-input bootbox-input-select form-control" id="modalBrokerSelector" name="broker">';
            dialog_message += '<option value="">{{Aucun}}</option>';

            $.each(eqBrokers, function (key, name) {
                dialog_message += '<option value="' + key + '" ' + (selectedBroker === key ? 'selected' : '') + '>' + name + '</option>';
            });
            dialog_message += '</select><br/>';

            dialog_message += '</div>'

            dialog_message += '</div>';

            dialog_message += `
    <div class="row">
        <div class="col-md-12">
            <h2 id="equipmentFound" class="hidden">{{Equipements trouvés}} <span id="countEquipements"></span></h2>
            <h2 id="noEquipmentFound" class="hidden">{{Aucun équipement trouvé}}</h2>
        </div>
    </div>
    <br/>
    `;

            return dialog_message;
        }

        // manage CTA button for modal (enable or disable)
        const toggleCommandForm = function () {
            const $selectedEquipmentsCommand = $('select.equipement-command');

            const $acceptButton = $('.bootbox-accept');

            const disableAcceptButton = function () {
                $acceptButton.attr('disabled', 'disabled');
                $acceptButton.addClass('disabled');
            }

            const enableAcceptButton = function () {
                $acceptButton.removeAttr('disabled');
                $acceptButton.removeClass('disabled');
            }

            if (!$selectedEquipmentsCommand.length) {
                const hasVirtualName = $('#virtualName').val();
                if (hasVirtualName) {
                    enableAcceptButton();
                    return;
                }

                disableAcceptButton();
                return;
            }

            // check if at least one command is selected
            const hasSelectedCommand = Array.from($selectedEquipmentsCommand).some(select => select.value !== '');

            if (hasSelectedCommand) {
                enableAcceptButton();
                return;
            }

            disableAcceptButton();
        };

        // build equipements command selectors in modal
        const buildEquipementsSelect = async function () {
            const $equimentsContainer = $('#equimentsContainer');
            const brokerId = $('#modalBrokerSelector').val();
            const parentObjectSelectorId = $('#modalParentObjectSelector').val();
            const $countEquipements = $('#countEquipements');
            const $noEquipmentFound = $('#noEquipmentFound');
            const $equipmentFound = $('#equipmentFound');
            const $actionForm = $('#actionForm');

            $equimentsContainer.empty();
            $actionForm.hide();

            if (brokerId === '' || parentObjectSelectorId === '') {
                $countEquipements.text('');
                $noEquipmentFound.removeClass('hidden');
                $equipmentFound.addClass('hidden');

                return;
            }

            const filterEquipments = function (jeeObject) {
                let equipments = [];
                if (jeeObject.equipments.length > 0) {
                    equipments = jeeObject.equipments;
                }

                if (jeeObject.child.length > 0) {
                    jeeObject.child.forEach(child => {
                        equipments.push(...filterEquipments(child));
                    });
                }

                return equipments;
            }

            const equipmentsData = await searchEquipments(brokerId, parentObjectSelectorId);
            const equipments = filterEquipments(equipmentsData.result);

            if (equipments.length === 0) {
                $countEquipements.text('');
                $noEquipmentFound.removeClass('hidden');
                $equipmentFound.addClass('hidden');
                return;
            }

            $countEquipements.text(equipments.length);
            $noEquipmentFound.addClass('hidden');
            $equipmentFound.removeClass('hidden');

            $actionForm.show();

            const buildEquipementForm = function (equipment) {

                const state = equipment?.values["etat"]?.value || '{{Inconnu}}';

                return `
<div class="form-group">
    <label for="equipement_${equipment.id}" class="control-label col-lg-7">
        <img class="lazy" src="plugins/jMQTT/core/img/node_${equipment.icon}.svg" style="min-height: 24px; height:24px; width:auto;padding-top:1px;">
        <span>${equipment.fullHumanName}</span>
    </label>
    <span class="col-lg-1 label label-${state === 'Inconnu' ? 'danger' : 'primary'}">
        ${state}
    </span>
    <select id="equipement_${equipment.id}" class="form-control col-lg-2 pull-right equipement-command" name="equipement_${equipment.id}" style="margin-right:10px;">
        <option value="">{{Aucune}}</option>
        ${equipment.commands.map(command => `<option value="${command}">${command}</option>`).join('')}
    </select>
    <div class="col-lg-2">
        &nbsp;
    </div>
</div>
`;
            }

            const buildEquipementsCheckbox = function (equipment) {
                return `
<div class="form-group">
    <label for="equipement_${equipment.id}" class="control-label col-lg-8">
        <img class="lazy" src="plugins/jMQTT/core/img/node_${equipment.icon}.svg" style="min-height: 24px; height:24px; width:auto;padding-top:1px;">
        <span>${equipment.fullHumanName}</span>
    </label>
    <div class="col-lg-1">
        <input type="checkbox" id="equipement_${equipment.id}" class="form-control pull-right" name="equipement_${equipment.id}" style="margin-right:10px;" checked>
    </div>
    <div class="col-lg-3">
        &nbsp;
    </div>
</div>
`;
            }

            const $commandSelector = $('#commandSelector');

            $.each(equipments, function (key, obj) {
                if ($commandSelector.length) {
                    // for now, we manage 2 modals. Either we send command to all selected equipements
                    $equimentsContainer.append(buildEquipementForm(obj));
                } else {
                    // either we create a virtual object with all equipements
                    $equimentsContainer.append(buildEquipementsCheckbox(obj));
                }
            });

            const commands = equipments.reduce((acc, equipment) => {
                equipment.commands.forEach(command => acc.add(command));
                return acc;
            }, new Set());

            // order set alphabetically
            const allCommands = Array.from(commands).sort();

            if (!$commandSelector.length) {
                return;
            }
            $commandSelector.empty();
            $commandSelector.append('<option value="">{{Aucune}}</option>');
            allCommands.forEach(command => {
                $commandSelector.append(`<option value="${command}">${command}</option>`);
            });
            bindCommandSelector();
        };

        const bindCommandSelector = function () {
            const form = $('#ajaxForm');
            $('select#commandSelector').on('change', function () {
                // set all equipements command to selected command
                const selectedCommand = $(this).val();
                $('select.equipement-command', form).each(function () {
                    // test if selector have this value
                    if ($(this).find(`option[value="${selectedCommand}"]`).length === 0) {
                        return;
                    }

                    $(this).val(selectedCommand);
                });
                toggleCommandForm();
            });

            $('select.equipement-command', form).on('change', function () {
                toggleCommandForm();
            });
        }

        // build line for each equipements in plugin index
        const buildObject = function (jeeObject) {

            const state = jeeObject?.values["etat"]?.value || '{{Inconnu}}';

            // TODO add timestamp of latest value as a tooltip
            // TODO create a timeout function that could refresh latest values
            return `
<div class="eqLogicDisplayCard cursor displayAsTable" data-object="${jeeObject.id}">
    <img class="lazy" src="plugins/jMQTT/core/img/node_${jeeObject.icon}.svg">
    <span class="name">${jeeObject.humanName}</span>
    <span class="hiddenAsCard input-group displayTableRight" style="font-size:12px">
        <span class="label label-${state === 'Inconnu' ? 'danger' : 'primary'}">
        ${state}
        </span>
    </span>
</div>
`;
        }

        // send ajax call to get equipments from broker and parent object
        const searchEquipments = async function (brokerId, parentObjectId) {
            if (!brokerId) {
                return [];
            }

            let data = `action=getEquipments&brokerId=${brokerId}`;
            if (parentObjectId) {
                data += `&parentObjectId=${parentObjectId}`;
            }

            try {
                const response = await $.ajax({
                    url: 'plugins/massAction/core/ajax/massAction.ajax.php',
                    type: 'POST',
                    data,
                    cache: false,
                    processData: false,
                });

                const returnData = JSON.parse(response);
                if (returnData.state !== 'ok') {
                    $.fn.showAlert({message: returnData.result, level: 'error'});
                    return;
                }

                return returnData;
            } catch (error) {
                console.error('Error fetching equipments:', error);
            }
        };

        // build plugin index page with equipements list and current state
        const buildEqLogicContainer = function (data) {
            const container = $('#eqLogicThumbnailContainer');
            container.find('div').remove();

            if (!data) {
                return;
            }

            const buildEquipments = function (jeeObject) {
                let equipments = [];

                if (jeeObject.equipments.length > 0) {
                    equipments = jeeObject.equipments.map(equipment => buildObject(equipment));
                }

                if (jeeObject.child.length > 0) {
                    jeeObject.child.forEach(child => {
                        equipments.push(...buildEquipments(child));
                    });
                }

                return equipments.filter(equipment => equipment.length > 0);
            }

            const equipments = buildEquipments(data.result);
            container.append(equipments);
        };

        const loadEquipmentsList = async function () {
            const brokerSelector = $('select#brokerSelector');
            const objectParent = $('select#parentObjectSelector');

            if (brokerSelector.val() === '' || objectParent.val() === '') {
                return;
            }

            const data = await searchEquipments(brokerSelector.val(), objectParent.val());
            if (data) {
                buildEqLogicContainer(data);
            }
        }

        const initPage = function () {
            $('#refreshEquipments').on('click', async function () {
                await loadEquipmentsList();
            });

            const brokerSelector = $('select#brokerSelector');
            const objectParent = $('select#parentObjectSelector');

            brokerSelector.on('change', async function () {
                await loadEquipmentsList();
            });

            objectParent.on('change', async function () {
                if (brokerSelector.value() === '') {
                    return;
                }
                const data = await searchEquipments(brokerSelector.val(), $(this).val());
                if (data) {
                    buildEqLogicContainer(data);
                }
            });

            $('.eqLogicAction[data-action=massAction]').off('click').on('click', async function () {

                let dialog_message = buildBaseModal(brokerSelector, objectParent);

                dialog_message += `
<div id="actionForm" style="display: none;">
    <div class="row">
        <div class="form-group col-md-12">
            <label for="commandSelector" class="control-label">Commandes</label>
            <select class="bootbox-input bootbox-input-select form-control" id="commandSelector" name="commandName">
                <option value="">{{Aucune}}</option>
            </select>
        </div>
        <div class="col-md-12" style="margin-top:10px;">
            <p class="bg-primary">
            Utiliser ce sélecteur pour envoyer la commande à tous les équipements sélectionnés.
            Vous pouvez cependant personnaliser les commandes pour chaque équipement.
            </p>
        </div>
    </div>
    <br/>
    <hr>
    <form id="ajaxForm">
        <div class="row" id="equimentsContainer" style="height:300px; overflow-y:scroll"></div>
    </form>
</div>   
        `;
                initModal('large', "Envoyer les commandes", dialog_message, 'sendCommands');
            });

            $('.eqLogicAction[data-action=addVirtual]').off('click').on('click', function () {
                let dialog_message = `<form id="ajaxForm">`;
                dialog_message += buildBaseModal(brokerSelector, objectParent);
                dialog_message += `
<div id="actionForm" style="display: none;">
    <div class="row">
        <div class="form-group col-md-12">
            <label for="virtualName" class="control-label">Nom du virtuel</label>
            <input id="virtualName" class="bootbox-input bootbox-input-text form-control" type="text" name="virtualName" required>
        
        <div class="form-group col-md-12 form-check">
            <label class="checkbox-inline"><input type="checkbox" name="isEnable" checked>Activer</label>
            <label class="checkbox-inline"><input type="checkbox" name="isVisible" checked>Visible</label>
        </div><br/>
        
        <div class="col-md-12" style="margin-top:10px;">
            <p class="bg-primary">
            Un object virtuel sera crée dans l'objet parent sélectionné, regroupant toute les commandes des équipements sélectionnés.
            </p>
        </div>
        
        <div class="row" id="equimentsContainer" style="height:300px; overflow-y:scroll"></div>
    </div>
    <br/>
</div>
</form>
        `;
                initModal('large', "Ajouter un virtuel", dialog_message, 'addVirtual');
            });
        }

        initPage();
    }
);
