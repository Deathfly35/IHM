let identifiant,motdepasse;

function Utilisateur(identifiant,motdepasse){

    this.identifiant = identifiant;
    this.motdepasse = motdepasse;

}

Utilisateur.prototype.getIdentifiant = function(){

    return this.identifiant;

}

Utilisateur.prototype.getMotDePasse = function(){

    return this.motdepasse;

}

module.exports = Utilisateur;
