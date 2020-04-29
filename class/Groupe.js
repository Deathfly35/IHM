var identifiant;
var listeMembres;
var createur;
var listeMessages;
var listeBannis;
var listeEvenements;
var public;

function Group(identifiant,createur,public){

  this.identifiant = identifiant;
  this.createur = createur;
  this.public = public;

  this.listeMembres = [];
  this.listeMessages = [];
  this.listeBannis = [];
  this.listeEvenements = [];

  this.listeMembres.push(createur);

}

Group.prototype.addMembre = function(nom){

  if(this.listeMembres.includes(nom) || this.listeBannis.includes(nom)){

    return false;

  }

  this.listeMembres.push(nom);

  return true;

}

Group.prototype.removeMembre = function(nom){

  this.listeMembres.splice( this.listeMembres.indexOf(nom), 1 );

}

Group.prototype.hasMembre = function(nom){

  return this.listeMembres.includes(nom);

}

Group.prototype.banMembre = function(nom){

  this.listeMembres.splice( this.listeMembres.indexOf(nom), 1 );
  this.listeBannis.push(nom);

}

Group.prototype.unbanMembre = function(nom){

  this.listeBannis.splice( this.listeMembres.indexOf(nom), 1 );

}

Group.prototype.addMessage = function(message){

  this.listeMessages.push(message);
  this.listeEvenements.push(message);

}

Group.prototype.addEvenement = function(message){

  this.listeEvenements.push(message);

}

Group.prototype.getIdentifiant = function(){

  return this.identifiant;

}

Group.prototype.getPublic = function(){

  return this.public;

}

Group.prototype.getListeMembres = function(){

  return this.listeMembres;

}

Group.prototype.getListeMessages = function(){

  return this.listeMessages;

}

Group.prototype.getListeEvenements = function(){

  return this.listeEvenements;

}


module.exports = Group;
