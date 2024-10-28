# massAction

Ce plugin permet d'envoyer simultanément une commande à plusieurs équipements.

## Prérequis

* L'interaction est actuellement possible uniquement avec les équipements enregistrés dans le plugin `jMQTT`.
* Le plugin `massAction` recherche une commande de type "info" nommée `etat` pour connaître l'état actuel de l'équipement.
* Les commandes à envoyer doivent être préalablement enregistrées dans chaque équipement avec le type `action`.

## Utilisation

* Sélectionner les équipements à commander en choisissant le broker et l'objet parent.
* Tous les équipements disponibles s'afficheront dans la liste.
  Les équipements seront recherchés dans les objets enfants de l'objet parent. Il est ainsi possible de sélectionner tous les équipements en partant du parent le plus haut.
* Il est possible de personnaliser finement les commandes à envoyer pour chaque équipement dans le formulaire `Actions`.
* En validant le formulaire, le broker enverra un message par commande et par équipement.
