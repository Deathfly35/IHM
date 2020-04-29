let listeUtilisateurs;

function ListeUtilisateur(){

    this.listeUtilisateurs = [];

}

ListeUtilisateur.prototype.add = function(utilisateur){

      this.listeUtilisateurs.push(utilisateur);

}

ListeUtilisateur.prototype.remove = function(utilisateur){

      this.listeUtilisateurs.splice( this.listeUtilisateurs.indexOf(this.get(utilisateur)), 1 );

}

ListeUtilisateur.prototype.get = function(utilisateur){

      return this.listeUtilisateurs.find(function(nomUtilisateur){

            return nomUtilisateur.getIdentifiant() == utilisateur;

      });

}

ListeUtilisateur.prototype.getListeUtilisateurs = function(){

    return this.listeUtilisateurs;

}

module.exports = ListeUtilisateur;
