<?php
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

function findTopicForEqLogic(eqLogic $eqLogic): ?string
{
    /** @var cmd[]|null $commands */
    $commands = $eqLogic->getCmd();
    $topic = null;
    foreach ($commands as $command) {
        $commandTopic = $command->getConfiguration('topic');
        $lastTopicElement = preg_replace('/.*\//', '', $commandTopic);
        if (null === $lastTopicElement) {
            continue;
        }

        if ('push' === $lastTopicElement) {
            $topic = $commandTopic;
            break;
        }

        // we already have a "down" topic, we're going to use the same topic
        if ('down' === $lastTopicElement) {
            $topic = $commandTopic.'/push';
            break;
        }

        // we have an "up" topic, we simply need to replace "up" by "down"
        if ('up' === $lastTopicElement) {
            // replace up by down in topic
            $topic = preg_replace('/\/up$/', '/down/push', $commandTopic);
            break;
        }
    }

    return $topic;
}


try {
    require_once dirname(__FILE__).'/../../../../core/php/core.inc.php';
    include_file('core', 'authentification', 'php');

    if (!isConnect('admin')) {
        throw new Exception(__('401 - Accès non autorisé', __FILE__));
    }

    require_once __DIR__.'/../../core/class/massAction.class.php';

    $action = init('action');

    switch ($action) {
        case "TO_DEFINE":
        {
            $hasError = false;

            if (!$hasError) {
                ajax::success();
            } else {
                ajax::error();
            }

            return;
        }
        case "getEquipments":
        {
            $brokerId = init('brokerId');
            $jMQTTs = jMQTT::byBrkId($brokerId);
            if (empty($jMQTTs)) {
                ajax::success([]);

                return;
            }

            $parentObjectId = init('parentObjectId');

            /** @var jeeObject $parentObject */
            $parentObject = jeeObject::byId($parentObjectId);
            if (null === $parentObject) {
                ajax::success([]);
            }

            // collect all child objects ids
            $objectIds = array_map(static function (jeeObject $object) {
                return $object->getId();
            }, $parentObject->getChilds());
            // add parent object id
            $objectIds[] = $parentObject->getId();

            $toReturn = [];
            foreach ($jMQTTs as $jMQTT) {
                if (\in_array($jMQTT->getObject_id(), $objectIds)) {
                    $toReturn[] = [
                        'id' => $jMQTT->getId(),
                        'name' => $jMQTT->getName(),
                    ];
                }
            }

            ajax::success($toReturn);

            return;
        }
        default:
            throw new RuntimeException(__('Aucune méthode correspondante à', __FILE__).' : '.$action);
    }
} catch (Exception $e) {
    ajax::error(displayException($e), $e->getCode());
}
