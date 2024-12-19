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

/**
 * @param jMQTT[] $jMQTTs
 */
function buildTree(jeeObject $parentObject, array $jMQTTs): array
{
    $equipments = buildEquipments($parentObject, $jMQTTs);

    $toReturn = [
        'id' => $parentObject->getId(),
        'name' => $parentObject->getName(),
        'equipments' => $equipments,
        'child' => [],
    ];

    $countEquipments = count($equipments);
    foreach ($parentObject->getChild() as $child) {
        $child = buildTree($child, $jMQTTs);
        $toReturn['child'][] = $child;
        $countEquipments += $child['countEquipments'];
    }

    $toReturn['countEquipments'] = $countEquipments;

    return $toReturn;
}

/**
 * @param jMQTT[] $jMQTTs
 */
function buildEquipments(jeeObject $parentObject, array $jMQTTs): array
{
    $equipments = [];
    foreach ($jMQTTs as $jMQTT) {
        if ($jMQTT->getObject_id() !== $parentObject->getId()) {
            continue;
        }

        $jMQTTObject = $jMQTT->getObject();
        $fullHumanName = [$jMQTTObject->getName()];
        while ($father = $jMQTTObject->getFather()) {
            $fullHumanName[] = $father->getName();
            $jMQTTObject = $father;
        }

        $fullHumanName = array_reverse($fullHumanName);
        $fullHumanName[] = $jMQTT->getName();

        $fullHumanName = implode(' - ', $fullHumanName);

        $equipmentToAdd = [
            'id' => $jMQTT->getId(),
            'name' => $jMQTT->getName(),
            'humanName' => $jMQTT->getHumanName(true, true),
            'fullHumanName' => $fullHumanName,
            'icon' => $jMQTT->getConfiguration('icone'),
            'values' => [],
            'commands' => [],
        ];

        /** @var cmd[] $commands */
        $commands = $jMQTT->getCmd(null, null, true);
        foreach ($commands as $command) {
            if ($command->getType() === 'info') {
                /** @var history[] $history */
                $history = $command->getHistory();
                $latestHistory = end($history);
                if (false === $latestHistory) {
                    continue;
                }
                $equipmentToAdd['values'][$command->getName()] = [
                    'value' => $latestHistory->getValue(),
                    'timestamp' => $latestHistory->getDatetime(),
                ];
            }

            if ($command->getType() === 'action') {
                // use key to ensure unicity in command name
                $equipmentToAdd['commands'][$command->getName()] = $command->getName();
            }
        }

        // drop the key
        $equipmentToAdd['commands'] = array_values($equipmentToAdd['commands']);

        $equipments[] = $equipmentToAdd;
    }

    return $equipments;
}

function applyTemplate(int $equipmentId, string $templateName, bool $keepCmd): bool
{
    /** @var jMQTT $eqpt */
    $eqpt = jMQTT::byId($equipmentId);
    if (!is_object($eqpt) || $eqpt->getEqType_name() != jMQTT::class) {
        massAction::logger('error', sprintf(__("Pas d'équipement jMQTT avec l'id %s", __FILE__), $equipmentId));

        return false;
    }
    try {
        $template = jMQTT::templateByName($templateName);
    } catch (\Exception $exception) {
        massAction::logger('error', sprintf(__("Pas de template jMQTT avec le nom %s", __FILE__), $templateName));

        return false;
    }
    massAction::logger('info', sprintf(__("Application du template %s sur l'équipement %s", __FILE__), $templateName, $eqpt->getName()));
    $eqpt->applyATemplate($template, init('topic'), $keepCmd);

    return true;
}

try {
    require_once dirname(__FILE__).'/../../../../core/php/core.inc.php';
    include_file('core', 'authentification', 'php');

    $jMQTTPlugin = null;
    try {
        $jMQTTPlugin = plugin::byId('jMQTT');
    } catch (\Throwable $e) {
        $jMQTTPlugin = null;
    }

    if ($jMQTTPlugin) {
        require_once __DIR__.'/../../../jMQTT/core/class/jMQTT.class.php';
    }

    if (!isConnect('admin')) {
        throw new Exception(__('401 - Accès non autorisé', __FILE__));
    }

    require_once __DIR__.'/../../core/class/massAction.class.php';

    $action = init('action');

    switch ($action) {
        case "sendCommands":
        {
            $errorMessages = [];

            // iterate over all equipements_xx key from $_POST and create an array of equipements with associated command name
            $selectedEquipments = [];
            foreach ($_POST as $key => $value) {
                if (empty($value)) {
                    continue;
                }

                if (preg_match('/^equipement_(\d+)$/', $key, $matches)) {
                    $selectedEquipments[$matches[1]] = $value;
                }
            }

            foreach ($selectedEquipments as $equipmentId => $commandName) {
                /** @var eqLogic|null|false $eqLogic */
                $eqLogic = eqLogic::byId($equipmentId);
                if (!$eqLogic) {
                    $errorMessage = sprintf('Équipement "%s" introuvable', $equipmentId);
                    massAction::logger('error', $errorMessage);
                    $errorMessages[] = $errorMessage;
                    continue;
                }

                /** @var cmd[] $cmds */
                $cmds = $eqLogic->getCmd('action', null, true);
                $elligibleCommands = array_filter($cmds, static function (cmd $cmd) use ($commandName) {
                    return $cmd->getName() === $commandName;
                });

                if (empty($elligibleCommands)) {
                    $errorMessage =
                        sprintf(
                            'Commande "%s" introuvable pour l\'équipement "%s"',
                            $commandName,
                            $eqLogic->getName(),
                        );
                    massAction::logger('error', $errorMessage);
                    $errorMessages[] = $errorMessage;
                    continue;
                }

                $commandToSend = reset($elligibleCommands);
                try {
                    $commandToSend->execCmd();
                } catch (Throwable $e) {
                    $errorMessage = sprintf(
                        'Erreur lors de l\'envoi de la commande "%s" pour l\'équipement "%s" : %s',
                        $commandName,
                        $eqLogic->getName(),
                        $e->getMessage()
                    );
                    massAction::logger('error', $errorMessage);
                    $errorMessages[] = $errorMessage;
                    continue;
                }
            }

            if (empty($errorMessages)) {
                ajax::success();
            } else {
                ajax::error(implode("\n", $errorMessages));
            }

            return;
        }
        case "addVirtual":
        {
            $plugin = plugin::byId('virtual');
            if (null === $plugin) {
                ajax::error('Le plugin virtuel n\'est pas installé');
            }

            $parentObjectId = init('parentObject');

            $isVisible = init('isVisible');
            $isVisible = empty($isVisible) ? 0 : 1;

            $isEnable = init('isEnable');
            $isEnable = empty($isEnable) ? 0 : 1;

            db::beginTransaction();

            /** @var jeeObject|null $parentObject */
            $parentObject = jeeObject::byId($parentObjectId);
            if (null === $parentObject) {
                $errorMessage = sprintf('Objet parent "%s" introuvable', $parentObjectId);
                massAction::logger('error', $errorMessage);
                ajax::error($errorMessage);
            }

            $virtual = new virtual();

            $virtualConfiguration = [
                'name' => init('virtualName'),
                'eqType_name' => 'virtual',
                'object_id' => $parentObject->getId(),
                'isVisible' => $isVisible,
                'isEnable' => $isEnable,
                'type' => 'virtual',
            ];
            utils::a2o($virtual, $virtualConfiguration);

            $virtual->save();

            // iterate over all equipements_xx key from $_POST and create an array of equipements with associated command name
            $selectedEquipments = [];

            foreach ($_POST as $key => $value) {
                if (empty($value) || $value !== 'on') {
                    continue;
                }

                if (preg_match('/^equipement_(\d+)$/', $key, $matches)) {
                    $selectedEquipments[] = $matches[1];
                }
            }

            // store all the virtual commands indexed by the command name
            $virtualCommands = [];

            foreach ($selectedEquipments as $equipment) {
                /** @var eqLogic|null|false $eqLogic */
                $eqLogic = eqLogic::byId($equipment);
                if (!$eqLogic) {
                    $errorMessage = sprintf('Équipement "%s" introuvable', $equipment);
                    massAction::logger('error', $errorMessage);
                    $errorMessages[] = $errorMessage;
                    continue;
                }

                $cmds = $eqLogic->getCmd('action', null, true);

                foreach ($cmds as $cmd) {
                    if (false === array_key_exists($cmd->getName(), $virtualCommands)) {
                        $virtualCommands[$cmd->getName()] = [];
                    }
                    $virtualCommands[$cmd->getName()][] = '#'.$cmd->getId().'#';
                }
            }

            foreach ($virtualCommands as $commandName => $commandHumanNames) {
                $combinedInfoName = implode(' && ', $commandHumanNames);

                $virtualCmd = new virtualCmd();
                $virtualCmd
                    ->setName($commandName)
                    ->setType('action')
                    ->setSubType('other')
                    ->setIsVisible(1)
                    ->setConfiguration('virtualAction', 1)
                    ->setConfiguration('infoName', $combinedInfoName)
                    ->setEqLogic_id($virtual->getId());

                $virtualCmd->save();
            }

            db::commit();

            ajax::success();

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

            if (empty($parentObjectId)) {
                /** @var jeeObject $parentObject */
                $parentObject = jeeObject::rootObject(false, true);
            } else {
                /** @var jeeObject $parentObject */
                $parentObject = jeeObject::byId($parentObjectId);
                if (null === $parentObject) {
                    ajax::success([]);
                }
            }

            $objects = buildTree($parentObject, $jMQTTs);

            ajax::success($objects);

            return;
        }
        case "applyTemplate":
        {
            $applyTemplateCommand = init('applyTemplateCommand');

            $keepCommand = $applyTemplateCommand === '1';

            // iterate over all equipements_xx key from $_POST and create an array of equipements with associated command name
            $selectedEquipments = [];

            foreach ($_POST as $key => $value) {
                if (empty($value) || $value !== 'on') {
                    continue;
                }

                if (preg_match('/^equipement_(\d+)$/', $key, $matches)) {
                    $selectedEquipments[] = $matches[1];
                }
            }

            DB::beginTransaction();
            foreach ($selectedEquipments as $equipmentId) {
                if (false === applyTemplate((int)$equipmentId, init('template'), $keepCommand)) {
                    DB::rollback();
                    ajax::error('Erreur lors de l\'application du template');
                }
            }
            DB::commit();
            ajax::success(sprintf('Template appliqué pour %d équipements', count($selectedEquipments)));
        }
        case "getTemplates":
        {
            if (null === $jMQTTPlugin) {
                ajax::error('Le plugin jMQTT n\'est pas installé');
            }
            ajax::success(jMQTT::templateList());
        }
        default:
            ajax::error(sprintf('Aucune méthode correspondante à "%s"', $action ?? 'N/A'));
    }
} catch (Exception $e) {
    ajax::error(displayException($e), $e->getCode());
}
