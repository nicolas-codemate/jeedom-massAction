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
                $('#screenForm').show();
                $acceptButton.removeAttr('disabled');
                $acceptButton.removeClass('disabled');
            } else {
                $('#screenForm').hide();
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

        const buildObject = function (jeeObject) {

            const state = jeeObject?.values["etat"]?.value || '{{Inconnu}}';

            return `
<div class="eqLogicDisplayCard cursor displayAsTable" data-object="${jeeObject.id}">
    <img class="lazy" src="plugins/jMQTT/core/img/node_${jeeObject.icon}.svg">
    <span class="name">${jeeObject.name}</span>
    <span class="hiddenAsCard input-group displayTableRight" style="font-size:12px">
        <span class="label label-${state === 'Inconnu' ? 'danger' : 'primary'}">
        ${state}
        </span>
        &nbsp;<span class="label label-success">Action</span>
    </span>
</div>
`;
        }

        const buildEquipments = function (jeeObject) {
            return `
<div class="objectDisplayCard displayAsTable cursor" data-object_id="${jeeObject.id}" data-object_name="${jeeObject.name}">
    <span class="name">${jeeObject.name}</span>
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

        $('select#brokerSelector').on('change', async function () {
            const data = await searchEquipments($(this).val());

            const container = $('#eqLogicThumbnailContainer');
            container.find('div').remove();

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
            console.log(equipments);
            container.append(equipments);

                // container.append(buildObject(data.result));
        });

        $('.eqLogicAction[data-action=updateScreen]').off('click').on('click', function () {
            let dialog_message = '';

            dialog_message += '<form id="ajaxForm">';
            dialog_message += '<div class="row">';
            dialog_message += '<div class="col-md-6">';

            dialog_message += '<label class="control-label">{{Broker utilisé :}}</label> ';
            dialog_message += '<select class="bootbox-input bootbox-input-select form-control" id="jmqttBrkSelector">';
            dialog_message += '<option value="">{{Aucun}}</option>';
            $.each(eqBrokers, function (key, name) {
                dialog_message += '<option value="' + key + '">' + name + '</option>';
            });
            dialog_message += '</select><br/>';

            dialog_message += '</div>'
            dialog_message += '<div class="col-md-6">';
            dialog_message += '<label class="control-label">{{Objet parent}}</label>';
            dialog_message += '<select class="bootbox-input bootbox-input-select form-control" id="parentObjectSelector">';
            dialog_message += '<option value="">{{Aucun}}</option>';
            $.each(objects, function (key, obj) {
                dialog_message += `<option value="${key}">${'&nbsp;'.repeat(obj.parentNumber)} ${obj.name} </option>`;
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

            dialog_message += '<div id="screenForm" style="display: none;">';

            dialog_message += `
        <div class="row">
            <div class="form-group col-md-3">
                <input class="form-check-input" type="radio" name="template" id="template1" value="1" checked>
                <label class="form-check-label" for="template2">Template 1</label>
            </div>
            <div class="form-group col-md-3">
                <input class="form-check-input" type="radio" name="template" id="template2" value="2" >
                <label class="form-check-label" for="template1">Template 2</label>
            </div>
        </div>
        <br/>
        `;

            // add fields TEXT 1 to 9
            for (let i = 1; i <= 9; i++) {
                if (i % 3 === 1) {
                    dialog_message += '<div class="row">';
                }
                dialog_message += '<div class="col-md-4">';
                dialog_message += `<label for="text_${i}" class="control-label">Texte ${i}</label>`;
                dialog_message += `<input type="text" class="bootbox-input bootbox-input-text form-control" autocomplete="nope" id="text_${i}" name="text_${i}" >`;
                dialog_message += '</div>';
                if (i % 3 === 0) {
                    dialog_message += '</div>';
                }
            }
            if (9 % 3 !== 0) {
                dialog_message += '</div>';
            }
            dialog_message += `
            <div class="row">
                <div class="col-md-4">
                    <label class="control-label" for="text_10">Texte 10</label>
                    <input type="text" class="bootbox-input bootbox-input-file form-control" autocomplete="nope" id="text_10" name="text_10">
                </div>
                <div class="col-md-8">
                    <label class="control-label" for="qrcode">{{QR Code}}</label>
                    <input type="text" class="bootbox-input bootbox-input-text form-control" id="qrcode" name="qrcode">
               </div>
            </div>
    `;

            dialog_message += '</div>';

            dialog_message += '</form>';

            bootbox.confirm({
                title: "{{Mise à jour des écrans}}",
                message: dialog_message,
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
                onShown: function () {
                    $('#jmqttBrkSelector, #parentObjectSelector').bind('change', function () {
                        searchEquipment();
                    });

                    toggleCommandForm();
                    $('#selectedEquipments').multiselect({
                        includeSelectAllOption: true,
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
                    formData.append('action', 'updateDisplay');
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
                            $.fn.showAlert({message: 'Modifications envoyées', level: 'success'});
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

