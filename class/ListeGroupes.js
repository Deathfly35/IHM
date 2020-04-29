let listeGroupes;

function ListGroup(){

    this.listeGroupes = [];

}

ListGroup.prototype.add = function(groupe){

      this.listeGroupes.push(groupe);

}

ListGroup.prototype.remove = function(groupe){

      this.listeGroupes.splice( this.listeGroupes.indexOf(this.get(groupe)), 1 );

}

ListGroup.prototype.get = function(groupe){

      return this.listeGroupes.find(function(nomGroupe){

            return nomGroupe.getIdentifiant() == groupe;

      });

}

ListGroup.prototype.getListeGroupes = function(){

    return this.listeGroupes;

}

module.exports = ListGroup;
