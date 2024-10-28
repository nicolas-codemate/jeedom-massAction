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
        const toggleCommandForm = function () {
            const $selectedEquipments = $('#selectedEquipments');
            const $acceptButton = $('.bootbox-accept');
            if ($selectedEquipments.value().length > 0) {
                $('#actionForm').show();
                $acceptButton.removeAttr('disabled');
                $acceptButton.removeClass('disabled');
            } else {
                $('#actionForm').hide();
                $acceptButton.attr('disabled', 'disabled');
                $acceptButton.addClass('disabled');
            }
        };

        const resetEquipementSelect = function () {
            const $selectedEquipments = $('#selectedEquipments');
            $selectedEquipments.empty();
            toggleCommandForm();
            rebuildEquipementSelect();
        };

        const rebuildEquipementSelect = function () {
            const $selectedEquipments = $('#selectedEquipments');
            $selectedEquipments.multiselect('rebuild');
            $selectedEquipments.multiselect('selectAll', false);
            $selectedEquipments.multiselect('refresh');
        }

        const buildEquipementsSelect = async function () {
            const $equimentsContainer = $('#equimentsContainer');
            $equimentsContainer.empty();
            resetEquipementSelect();
            const brokerId = $('#jmqttBrkSelector').val();
            const parentObjectSelectorId = $('#modalParentObjectSelector').val();

            if (brokerId === '' || parentObjectSelectorId === '') {
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
    <select id="equipement_${equipment.id}" class="form-control col-lg-2 pull-right" name="equipement_${equipment.id}" style="margin-right:10px;">
        <option value="">{{Aucune}}</option>
        ${equipment.commands.map(command => `<option value="${command}">${command}</option>`).join('')}
    </select>
    <div class="col-lg-2">
        &nbsp;
    </div>
</div>
</div>
`;
            }

            $.each(equipments, function (key, obj) {
                const $selectedEquipments = $('#selectedEquipments');
                $selectedEquipments.append(`<option value="${obj.id}">${obj.name}</option>`);
                $equimentsContainer.append(buildEquipementForm(obj));
            });

            rebuildEquipementSelect();

            const commands = equipments.reduce((acc, equipment) => {
                equipment.commands.forEach(command => acc.add(command));
                return acc;
            }, new Set());

            // order set alphabetically
            const allCommands = Array.from(commands).sort();

            const $commandSelector = $('#commandSelector');
            $commandSelector.empty();
            $commandSelector.append('<option value="">{{Aucune}}</option>');
            allCommands.forEach(command => {
                $commandSelector.append(`<option value="${command}">${command}</option>`);
            });
        };

        const buildObject = function (jeeObject) {

            const state = jeeObject?.values["etat"]?.value || '{{Inconnu}}';

            // TODO add timestamp of latest value as a tooltip
            // TODO implement "Action" button.
            // TODO best scenario, I would like to add every object even if there is no equipements to add the ability to click action button and open modal with all child equipements already selected
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

        const buildEqLogicContainer = function (data) {
            const container = $('#eqLogicThumbnailContainer');
            container.find('div').remove();

            if (!data) {
                return;
            }

            const buildEquipments = function (jeeObject) {
                let equipments = [];

                // console.log(jeeObject);

                // if(jeeObject.equipments.length === 0 && jeeObject.child.length === 0) {
                //     return [buildEmptyState()];
                // }

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

        const brokerSelector = $('select#brokerSelector');
        const objectParent = $('select#parentObjectSelector');

        brokerSelector.on('change', async function () {
            if (objectParent.value() === '' || $(this).val() === '') {
                buildEqLogicContainer();
                return;
            }
            const data = await searchEquipments($(this).val(), objectParent.val());
            if (data) {
                buildEqLogicContainer(data);
            }
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

            const selectedBroker = brokerSelector.val();
            const selectedObject = objectParent.val();

            let dialog_message = '';

            dialog_message += '<form id="ajaxForm">';
            dialog_message += '<div class="row">';

            // Object parent selector
            dialog_message += '<div class="col-md-6">';
            dialog_message += '<label class="control-label">{{Objet parent}}</label>';
            dialog_message += '<select class="bootbox-input bootbox-input-select form-control" id="modalParentObjectSelector">';
            dialog_message += '<option value="">{{Aucun}}</option>';
            $.each(objects, function (key, obj) {
                dialog_message += `<option value="${key}" ${selectedObject === key ? 'selected' : ''}>${'&nbsp;'.repeat(obj.parentNumber)} ${obj.name} </option>`;
            });
            dialog_message += '</select><br/>';
            dialog_message += '</div>'

            // Broker selector
            dialog_message += '<div class="col-md-6">';

            dialog_message += '<label class="control-label">{{Broker utilisé :}}</label> ';
            dialog_message += '<select class="bootbox-input bootbox-input-select form-control" id="jmqttBrkSelector">';
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
            <label class="control-label">{{Equipements}}</label>
            <select id="selectedEquipments" multiple="multiple" name="selectedEquipments[]"></select>
        </div>
    </div>
    <br/>
    `;

            dialog_message += '<div id="actionForm" style="display: none;">';

            dialog_message += `
        <div class="row">
            <div class="form-group col-md-12">
                <label for="commandSelector" class="control-label">{{Commandes}}</label>
                <select class="bootbox-input bootbox-input-select form-control" id="commandSelector" name="commandName">
                    <option value="">{{Aucune}}</option>
                </select>
            </div>
        </div>
        <br/>
        `;

            dialog_message += `
        <hr>
        <div class="row" id="equimentsContainer" style="height:200px; overflow-y:scroll"></div>   
            `

            dialog_message += '</div>';

            dialog_message += '</form>';

            bootbox.confirm({
                title: "{{Envoyer les commandes}}",
                message: dialog_message,
                size: 'large',
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
                    $('#selectedEquipments').multiselect({
                        includeSelectAllOption: true,
                    });
                    await buildEquipementsSelect();
                    toggleCommandForm();
                    $('#jmqttBrkSelector, #modalParentObjectSelector').bind('change', async function () {
                        await buildEquipementsSelect();
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
                    formData.append('action', 'sendCommands');
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
                            $.fn.showAlert({message: 'Commandes envoyées', level: 'success'});
                        },
                        cache: false,
                        contentType: false,
                        processData: false,
                    });
                }
            });
        });
    }
)
;

