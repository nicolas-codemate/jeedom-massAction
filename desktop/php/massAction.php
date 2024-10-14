<?php

if (!isConnect('admin')) {
    throw new Exception('{{401 - Accès non autorisé}}');
}

$plugin = plugin::byId('massAction');
sendVarToJS('eqType', $plugin->getId());


/** @var jMQTT[][] $eqNonBrokers */
$eqNonBrokers = jMQTT::getNonBrokers();


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

/**
 *
 * @param jMQTT $eqL
 */
function displayEqLogicCard($eqL)
{
    echo '<div class="eqLogicDisplayCard displayAsTable cursor" data-eqLogic_id="'.$eqL->getId().'" jmqtt_type="'.$eqL->getType().'">';
    if ($eqL->getType() !== 'brk') {
        echo '<img class="lazy" src="plugins/jMQTT/core/img/node_broker.svg" />';
    } else {
        echo '<img class="lazy" src="plugins/jMQTT/core/img/node_.svg" />';
    }
    echo '<span class="name">'.$eqL->getHumanName(true, true).'</span>';
    echo '<span class="input-group displayTableRight" style="font-size:12px"></span></div>'."\n";
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
                <div class="cursor eqLogicAction logoSecondary" data-action="gotoPluginConf">
                    <i class="fas fa-wrench"></i>
                    <br>
                    <span>{{Configuration}}</span>
                </div>
            </div>
        </div>
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

        <?php
        // Check if there are orphans first
        //        $has_orphans = false;
        //        foreach ($eqNonBrokers as $id => $nonBrokers) {
        //            if (!isset($eqBrokers[$id])) {
        //                if (!$has_orphans) {
        //                    echo '<div class="eqLogicThumbnailContainer">';
        //                    echo '<legend class="danger"><i class="fas fa-table"></i> {{Mes Equipements orphelins}}&nbsp;<sup>';
        //                    echo '<i class="fas fa-exclamation-triangle tooltips" title="';
        //                    echo '{{Ces équipements ne sont associés à aucun broker et ne peuvent donc pas communiquer.}}<br/>';
        //                    echo '{{Il ne devrait pas y avoir un seul orphelin : supprimez-les ou rattachez-les à un broker.}}"></i></sup></legend>';
        //                    $has_orphans = true;
        //                }
        //                foreach ($nonBrokers as $eqL) {
        //                    displayEqLogicCard($eqL);
        //                }
        //            }
        //        }
        //        if ($has_orphans) {
        //            echo '</div>';
        //        }

        //        foreach ($eqBrokers as $eqB) {
        //            $nbEq = count($eqNonBrokers[$eqB->getId()]);
        //            echo '<legend><i class="fas fa-table"></i> {{Mes Equipements sur le broker}} <b>'.$eqB->getName().'</b> ('.$nbEq.')</legend>';
        //            echo '<div class="eqLogicThumbnailContainer">';
        ////            displayEqLogicCard($eqB);
        //            foreach ($eqNonBrokers[$eqB->getId()] as $eqL) {
        //                displayEqLogicCard($eqL);
        //            }
        //            echo '</div>';
        //        }
        ?>
        <div class="eqLogicThumbnailContainer" id="eqLogicThumbnailContainer">
            <legend>
                <i class="fas fa-table"></i> {{Mes Equipements sur le broker}}
            </legend>
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
