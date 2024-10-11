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

?>

<div class="row row-overflow">
    <!-- Page d'accueil du plugin -->
    <div class="col-xs-12 eqLogicThumbnailDisplay">
        <legend><i class="fas fa-cog"></i> {{Gestion}}</legend>
        <!-- Boutons de gestion du plugin -->
        <div class="eqLogicThumbnailContainer">
            <div class="cursor eqLogicAction logoPrimary" data-action="massAction">
                <i class="fas fa-plus-circle"></i>
                <br>
                <span>{{Actions}}</span>
            </div>
            <div class="cursor eqLogicAction logoSecondary" data-action="gotoPluginConf">
                <i class="fas fa-wrench"></i>
                <br>
                <span>{{Configuration}}</span>
            </div>
        </div>
    </div> <!-- /.eqLogicThumbnailDisplay -->
</div>

<!-- Inclusion du fichier javascript du plugin (dossier, nom_du_fichier, extension_du_fichier, id_du_plugin) -->
<?php
include_file('desktop', 'massAction', 'js', 'massAction');
include_file('desktop', 'bootstrap-multiselect', 'js', 'massAction');
include_file('desktop', 'bootstrap-multiselect', 'css', 'massAction');
?>

<!-- Inclusion du fichier javascript du core - NE PAS MODIFIER NI SUPPRIMER -->
<?php
include_file('core', 'plugin.template', 'js'); ?>
