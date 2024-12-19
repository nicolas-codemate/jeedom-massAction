<?php

if (!isConnect('admin')) {
    throw new Exception('{{401 - Accès non autorisé}}');
}

$plugin = plugin::byId('massAction');
sendVarToJS('eqType', $plugin->getId());

$eqBrokers = jMQTT::getBrokers();
$eqBrokersName = [];
foreach ($eqBrokers as $brokerId => $broker) {
    $eqBrokersName[$brokerId] = $broker->getName();
}
sendVarToJS('eqBrokers', $eqBrokersName);

$objects = [];
foreach (jeeObject::buildTree() as $object) {
    $objects[$object->getId()] = [
        'name' => $object->getName(),
        'parentNumber' => $object->getConfiguration('parentNumber'),
    ];
}

sendVarToJS('objects', $objects);

$virtualPlugin = null;
try {
    $virtualPlugin = plugin::byId('virtual');
} catch (\Throwable $e) {
    $virtualPlugin = null;
}

$jMQTTPlugin = null;
try {
    $jMQTTPlugin = plugin::byId('jMQTT');
} catch (\Throwable $e) {
    $jMQTTPlugin = null;
}

?>

<div class="row row-overflow">
    <!-- Page d'accueil du plugin -->
    <div class="col-xs-12 eqLogicThumbnailDisplay">
        <div class="row">
            <legend><i class="fas fa-cog"></i> {{Gestion}}</legend>
            <!-- Boutons de gestion du plugin -->
            <div class="eqLogicThumbnailContainer">
                <div class="cursor eqLogicAction logoPrimary" data-action="massAction">
                    <i class="fas fa-plus-circle"></i>
                    <br>
                    <span>{{Actions}}</span>
                </div>
                <?php if ($virtualPlugin) { ?>
                    <div class="cursor eqLogicAction logoPrimary" data-action="addVirtual">
                        <i class="fas fa-plus-circle"></i>
                        <br>
                        <span>{{Virtuel}}</span>
                    </div>
                <?php } ?>
                <?php if ($jMQTTPlugin) { ?>
                <div class="cursor eqLogicAction logoPrimary" data-action="applyTemplate">
                    <i class="fa fa-file-code"></i>
                    <br>
                    <span>{{Appliquer Template}}</span>
                </div>
                <?php } ?>
                <div class="cursor eqLogicAction logoSecondary" data-action="gotoPluginConf">
                    <i class="fas fa-wrench"></i>
                    <br>
                    <span>{{Configuration}}</span>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-3">
                <div class="input-group" style="margin:5px;">
                    <label for="parentObjectSelector">{{Objet parent}}</label>
                    <select id="parentObjectSelector" class="form-control" style="width: 100%;">
                        <?php
                        foreach ($objects as $objectId => $object) {
                            echo '<option value="'.$objectId.'">'.str_repeat('&nbsp;', $object['parentNumber']).$object['name'].'</option>';
                        }
                        ?>
                    </select>
                </div>
            </div>
            <div class="col-md-3">
                <div class="input-group" style="margin:5px;">
                    <label for="brokerSelector">{{Choix du broker}}</label>
                    <select id="brokerSelector" class="form-control" style="width: 100%;">
                        <option value="">{{Tous les brokers}}</option>
                        <?php
                        foreach ($eqBrokers as $eqB) {
                            echo '<option value="'.$eqB->getId().'">'.$eqB->getName().'</option>';
                        }
                        ?>
                    </select>
                </div>
            </div>
            <div class="col-md-3" style="padding-top:30px;">
                <button class="btn btn-lg btn-success" id="refreshEquipments">
                    <i class="fas fa-sync"></i> {{Rafraîchir}}
            </div>
        </div>
        <div class="eqLogicThumbnailContainer" id="eqLogicThumbnailContainer">
            <legend>
                <i class="fas fa-table"></i> {{Mes Equipements sur le broker}}
            </legend>
        </div>
    </div> <!-- /.eqLogicThumbnailDisplay -->

    <!-- Inclusion du fichier javascript du plugin (dossier, nom_du_fichier, extension_du_fichier, id_du_plugin) -->
    <?php
    include_file('desktop', 'massAction', 'js', 'massAction');
    ?>

    <!-- Inclusion du fichier javascript du core - NE PAS MODIFIER NI SUPPRIMER -->
    <?php
    include_file('core', 'plugin.template', 'js');
    ?>
