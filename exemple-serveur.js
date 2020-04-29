let Groupe = require('../class/Groupe.js');
let ListeGroupes = require('../class/ListeGroupes.js');
let ListeUtilisateurs = require('../class/ListeUtilisateurs.js');
let Utilisateur = require('../class/Utilisateur.js');

let listeGroupes = new ListeGroupes();
let listeUtilisateurs = new ListeUtilisateurs();

let socketio = require('socket.io');

const crypto = require("crypto");
const exempleServeur = crypto.createECDH('brainpoolP256r1');
exempleServeur.generateKeys();

let bcrypt = require('bcryptjs');
let io = socketio.listen(3636);

let debug = require('debug')('true');

let nbUtilisateur = 0;
let tabSocket = [];
let groupe, utilisateur;

let sq = require('sqlite3').verbose();
let db = new sq.Database('../BDD/baseDeDonnee.db3');

function genererMotDePasse(utilisateur, motDePasse){

  bcrypt.genSalt(10, function(err, salt) {

      bcrypt.hash(motDePasse, salt, function(err, hash) {

            db.run("INSERT INTO Utilisateur VALUES(\"" + utilisateur + "\",\"" + hash + "\")");
            listeUtilisateurs.add(new Utilisateur(utilisateur,hash));

      });

  });

}

try{

      /*
      db.run("DROP TABLE IF EXISTS groupeBannis");
      db.run("DROP TABLE IF EXISTS groupeMessage");
      db.run("DROP TABLE IF EXISTS groupeEvenement");
      db.run("DROP TABLE IF EXISTS groupeUtilisateur");
      db.run("DROP TABLE IF EXISTS groupe");
      db.run("DROP TABLE IF EXISTS utilisateur");
      */

      db.run("CREATE TABLE IF NOT EXISTS groupe (idGroupe TEXT PRIMARY KEY,creator TEXT, public BOOLEAN)");
      db.run("CREATE TABLE IF NOT EXISTS groupeUtilisateur (idUtilisateur TEXT,idGroupe TEXT, PRIMARY KEY(idUtilisateur,idGroupe), FOREIGN KEY (idGroupe) REFERENCES groupe(idGroupe) ON DELETE CASCADE)");
      db.run("CREATE TABLE IF NOT EXISTS groupeEvenement (idEvenement INTEGER PRIMARY KEY, text TEXT,idGroupe TEXT, FOREIGN KEY (idGroupe) REFERENCES groupe(idGroupe) ON DELETE CASCADE)");
      db.run("CREATE TABLE IF NOT EXISTS groupeMessage (idMessage INTEGER PRIMARY KEY, text TEXT,idGroupe TEXT, FOREIGN KEY (idGroupe) REFERENCES groupe(idGroupe) ON DELETE CASCADE)");
      db.run("CREATE TABLE IF NOT EXISTS utilisateur (idUtilisateur TEXT PRIMARY KEY,password TEXT)");
      db.run("CREATE TABLE IF NOT EXISTS groupeBannis (idBannis TEXT,idGroupe TEXT, PRIMARY KEY (idBannis,idGroupe), FOREIGN KEY (idGroupe) REFERENCES groupe(idGroupe) ON DELETE CASCADE)");


} catch(err){

      console.log(err);

}

db.each("SELECT * FROM utilisateur", function(err, row) {

      if(err){

            console.log(err);

      } else {

            listeUtilisateurs.add(new Utilisateur(row.idUtilisateur,row.password));

      }

});

db.each("SELECT * FROM groupe", function(err, row) {

      if (err) {

            console.log(err);

      } else {

            groupe = new Groupe(row.idGroupe,row.creator,row.public);

            db.each("SELECT * FROM groupeUtilisateur WHERE idGroupe =\"" + row.idGroupe + "\"", function(errSecond, rowSecond) {

                  if (errSecond) {

                        console.log(errSecond);

                  } else {

                        groupe.addMembre(rowSecond.idUtilisateur);

                  }

            });

            db.each("SELECT * FROM groupeEvenement WHERE idGroupe = \"" + row.idGroupe + "\"", function(errSecond, rowSecond) {

                  if (errSecond) {

                        console.log(errSecond);

                  } else {

                        groupe.addEvenement(rowSecond.text);

                  }

            });

            db.each("SELECT * FROM groupeMessage WHERE idGroupe = \"" + row.idGroupe + "\"", function(errSecond, rowSecond) {

                  if (errSecond) {

                        console.log(errSecond);

                  } else {

                        groupe.addEvenement(rowSecond.text);

                  }

            });

            db.each("SELECT * FROM groupeBannis WHERE idGroupe = \"" + row.idGroupe + "\"", function(errSecond, rowSecond) {

                  if (errSecond) {

                        console.log(errSecond);

                  } else {

                        groupe.banMembre(rowSecond.idUtilisateur);

                  }

            });

            listeGroupes.add(groupe);

      }

});


io.on('connection', function(socket) {

    socket.on('send', function(msg) {

            switch(msg.action){

                case 'auth' :

                      const cleServeur = exempleServeur.getPublicKey('base64');
                      var serveurLength = Buffer.from(cleServeur, 'base64').length;

                      var cleClientPublic = msg.clePublic;
                      var clientBuffer = Buffer.from(cleClientPublic, 'base64');
                      var cleClient = Buffer.alloc(serveurLength);

                      clientBuffer.copy(cleClient, 1, 8);
                      cleClient[0] = 4;

                      const hash = crypto.createHash('sha256');
                      var tt = exempleServeur.computeSecret(cleClient);
                      var cleSecreteServeur = hash.update(tt).digest('base64');

                      socket.emit('message',{'action':'server-auth','message':'authentification','clePublic' : cleServeur,'cleSecrete' : cleSecreteServeur});

                case 'client-connection':

                      utilisateur = listeUtilisateurs.get(msg.sender);

                      if(utilisateur !== undefined){

                            bcrypt.compare(msg.password, utilisateur.getMotDePasse(), function(err, res) {

                                  if(!res){

                                        socket.emit('message',{'action':'server-deconnection','message':'mot de passe incorrect'});

                                  } else {

                                        nbUtilisateur++;

                                        socket.emit('message',{'action':'server-connection','message':'bienvenue il y a actuellement ' + nbUtilisateur + ' utilisateurs connectés'});

                                        socket.broadcast.emit('message',{'action':'server-connection','message': msg.sender + ' s\'est connecté'});

                                        tabSocket[msg.sender] = socket;

                                  }

                            });

                      } else {

                            genererMotDePasse(msg.sender,msg.password);

                            nbUtilisateur++;

                            socket.emit('message',{'action':'server-connection','message':'bienvenue il y a actuellement ' + nbUtilisateur + ' utilisateurs connectés'});

                            socket.broadcast.emit('message',{'action':'server-connection','message': msg.sender + ' s\'est connecté'});

                            tabSocket[msg.sender] = socket;

                      }
                      break;

                case 'client-send':

                      if(tabSocket[msg.dest] !== null){

                            socket.emit('message',{'action':'server-send','message': 'vous avez envoyé ' + msg.msg + ' à ' + msg.dest});
                            tabSocket[msg.dest].emit('message',{'action':'server-send','message': 'message privé de ' + msg.sender +  ' : ' + msg.msg});

                      } else {

                            socket.emit('message',{'action':'server-send','message': 'aucun destinataire correspondant à ' + msg.dest});

                      }

                      break;

                case 'client-broadcast':

                      socket.broadcast.emit('message',{'action':'server-broadcast','message': 'message public de ' + msg.sender +  ' : ' + msg.msg});
                      socket.emit('message',{'action':'server-broadcast','message': 'vous avez envoyé ' + msg.msg});

                      break;

                case 'client-list-clients':

                      let listeNom = "Liste des clients : ";
                      for(let tmpSocket in tabSocket){

                            listeNom += "\n>\t" + tmpSocket;

                      }

                      socket.emit('message',{'action':'server-list','message':listeNom});
                      break;

                case 'client-quit':

                      socket.emit('message',{'action':'server-quit','message': 'vous êtes déconnecté'});

                      delete tabSocket[msg.sender];

                      nbUtilisateur--;

                      socket.broadcast.emit('message',{'action':'server-quit','message': msg.sender + ' s\'est déconnecté'});

                      break;

                case 'cgroupe':

                      groupe = new Groupe(msg.group,msg.sender,true);

                      if(listeGroupes.get(groupe) === undefined){

                            db.run("INSERT INTO groupe VALUES(\"" + msg.group + "\",\"" + msg.sender + "\",true)");
                            db.run("INSERT INTO groupeUtilisateur VALUES(\"" + msg.sender + "\",\"" + msg.group + "\")");

                            listeGroupes.add(groupe);

                            socket.broadcast.emit('message',{'action':'server-cgroupe','message': msg.sender + ' a crée le groupe : ' + msg.group});
                            socket.emit('message',{'action':'server-cgroupe','message':'Vous avez crée le groupe : ' + msg.group});

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + "création du groupe" + "\",\"" + msg.group + "\")");
                            groupe.addEvenement('création du groupe');

                      } else {

                            socket.emit('message',{'action':'server-cgroupe','message':'Un groupe porte déjà le nom : ' + msg.group});

                      }

                      break;

                case 'join':
                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.getPublic()){

                            if(groupe.addMembre(msg.sender)){

                                  let listeMembres = groupe.getListeMembres();

                                  for(let i = 0; i < listeMembres.length;i++){

                                        if(listeMembres[i] !== msg.sender){

                                              tabSocket[listeMembres[i]].emit('message',{'action':'server-join','message': msg.sender + ' a rejoint le groupe : ' + msg.group});

                                        } else {

                                              tabSocket[listeMembres[i]].emit('message',{'action':'server-join','message':'vous avez rejoint le groupe : ' + msg.group});

                                        }

                                  }

                                  db.run("INSERT INTO groupeUtilisateur VALUES(\"" + msg.sender + "\",\"" + msg.group + "\")");
                                  db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a rejoint le groupe" + "\",\"" + msg.group + "\")");
                                  groupe.addEvenement(msg.sender + ' a rejoint le groupe');

                            } else {

                                  socket.emit('message',{'action':'server-join','message':'vous êtes bannis ou déjà dans le groupe : ' + msg.group});

                            }

                      } else {

                            socket.emit('message',{'action':'server-join','message':'aucun groupe correspondant à ' + msg.group});

                      }

                      break;

                case 'gbroadcast':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            db.run("INSERT INTO groupeMessage(text,idGroupe) VALUES(\"" + msg.sender + " sur le groupe : " + msg.group + " a envoyé : " + msg.msg + "\",\"" + msg.group + "\")");
                            groupe.addMessage(msg.sender + ' sur le groupe : ' + msg.group + ' a envoyé : ' + msg.msg);

                            let listeMembres = groupe.getListeMembres();

                            for(let i = 0; i < listeMembres.length;i++){

                                  if(tabSocket[listeMembres[i]] !== undefined){

                                        if(listeMembres[i] !== msg.sender){

                                              tabSocket[listeMembres[i]].emit('message',{'action':'server-gbroadcast','message': msg.sender + ' sur ' + msg.group + ' : ' + msg.msg});

                                        } else {

                                              tabSocket[listeMembres[i]].emit('message',{'action':'server-gbroadcast','message':'vous avez envoyé le message ' + msg.msg + ' sur le groupe : ' + msg.group});

                                        }

                                  }

                            }

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a envoyé : " + msg.msg + "\",\"" + msg.group + "\")");
                            groupe.addEvenement(msg.sender + ' a envoyé : ' + msg.msg);

                      } else {

                            socket.emit('message',{'action':'server-gbroadcast','message':'aucun groupe correspondant à ' + msg.group + ' ou alors vous ne faites pas partie du groupe'});

                      }

                      break;

                case 'members':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined  && groupe.hasMembre(msg.sender)){

                            let listeMembres = groupe.getListeMembres();
                            let listeNomsClients = "Liste des membres de " + msg.group + " : ";

                            for(let i = 0; i < listeMembres.length; i++){

                                  listeNomsClients += "\n>\t" + listeMembres[i];

                            }

                            socket.emit('message',{'action':'server-members', 'message' : listeNomsClients});

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + "consultation des membres par " + msg.sender + "\",\"" + msg.group + "\")");
                            groupe.addEvenement('consultation des membres par ' + msg.sender);

                      } else {

                            socket.emit('message',{'action':'server-members','message':'aucun groupe correspondant à ' + msg.group + ' ou alors vous ne faites pas partie du groupe'})

                      }

                      break;

                case 'msgs':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            let listeMessages = groupe.getListeMessages();
                            let listeNomsMessages = "Liste des messages de " + msg.group + ' : ';

                            for(let i = 0; i < listeMessages.length; i++){

                                  listeNomsMessages += "\n>\t" + listeMessages[i];

                            }

                            socket.emit('message',{'action':'server-messages', 'message' : listeNomsMessages});

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + "consultation des messages par " + msg.sender + "\",\"" + msg.group + "\")");
                            groupe.addEvenement('consultation des messages par ' + msg.sender);

                      } else {

                            socket.emit('message',{'action':'server-messages','message':'aucun groupe correspondant à ' + msg.group + ' ou alors vous ne faites pas partie du groupe'});

                      }
                      break;

                case 'groups':

                      let groupes = listeGroupes.getListeGroupes();
                      let listeNomsGroupes = "Liste des groupes : ";

                      for(let i = 0; i < groupes.length; i++){

                            listeNomsGroupes += "\n>\t" + groupes[i].getIdentifiant();

                      }

                      socket.emit('message',{'action':'server-groups', 'message' : listeNomsGroupes});

                      break;

                case 'leave':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            if(groupe.hasMembre(msg.sender)){

                                  let listeMembres = groupe.getListeMembres();

                                  for(let i = 0; i < listeMembres.length;i++){

                                        if(tabSocket[listeMembres[i]] !== undefined){

                                              if(listeMembres[i] !== msg.sender){

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-leave','message': msg.sender + ' a quitté le groupe : ' + msg.group});

                                              } else {

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-leave','message':'vous avez quitté le groupe ' + msg.group});

                                              }

                                        }

                                  }

                                  db.run("DELETE FROM groupeUtilisateur WHERE idUtilisateur = \"" + msg.sender + "\" and idGroupe = \"" + msg.group + "\"");
                                  groupe.removeMembre(msg.dest);

                                  if(groupe.getListeMembres().length === 0){

                                        listeGroupes.remove(msg.group);
                                        db.run("DELETE FROM groupeUtilisateur WHERE idGroupe = \"" + msg.group + "\"");
                                        db.run("DELETE FROM groupeEvenement WHERE idGroupe = \"" + msg.group + "\"");
                                        db.run("DELETE FROM groupeMessage WHERE idGroupe = \"" + msg.group + "\"");
                                        db.run("DELETE FROM groupeBannis WHERE idGroupe = \"" + msg.group + "\"");
                                        db.run("DELETE FROM groupe WHERE idGroupe = \"" + msg.group + "\"");

                                  }

                                  db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a quitté le groupe" + "\",\"" + msg.group + "\")");
                                  groupe.addEvenement(msg.sender + ' a quitté le groupe');

                            } else {

                                  socket.emit('message',{'action':'server-leave','message':'vous n\'êtes pas dans le groupe : ' + msg.group});

                            }

                      } else {

                            socket.emit('message',{'action':'server-leave','message':'aucun groupe correspondant à ' + msg.group + ' ou alors vous ne faites pas partie du groupe'});

                      }

                      break;

                case 'invite':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            if(!groupe.hasMembre(msg.dest)){

                                  socket.emit('message',{'action':'server-invite','groupe':msg.group,'message':'vous avez invité ' + msg.dest + ' a rejoindre le groupe : ' + msg.group});
                                  tabSocket[msg.dest].emit('message',{'action':'server-invite','groupe':msg.group, 'message': msg.sender + ' vous invite a rejoindre le groupe : ' + msg.group + ' (tapez oui ou non)'});

                                  db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a invité " + msg.dest + "\",\"" + msg.group + "\")");
                                  groupe.addEvenement(msg.sender + ' a invité ' + msg.dest);

                            } else {

                                  socket.emit('message',{'action':'server-invite','groupe':msg.group,'message':msg.dest + ' est déjà dans le groupe : ' + msg.group});

                            }

                      } else {

                            socket.emit('message',{'action':'server-invite','message':'aucun groupe correspondant à ' + msg.group + ' ou vous ne faites pas partie du groupe'});

                      }

                      break;

                case 'kick':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            if(groupe.hasMembre(msg.dest)){

                                  let listeMembres = groupe.getListeMembres();

                                  for(let i = 0; i < listeMembres.length;i++){

                                        if(tabSocket[listeMembres[i]] !== undefined){

                                              if(listeMembres[i] !== msg.dest && listeMembres[i] !== msg.sender){

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-kick','message': msg.dest + ' a été kick du groupe : ' + msg.group + ' par ' + msg.sender + ' pour la raison suivante : ' + msg.reason});

                                              } else if(listeMembres[i] === msg.sender){

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-kick','message': 'vous avez kick ' + msg.dest + ' du groupe : ' + msg.group + ' pour la raison suivante : ' + msg.reason});

                                              }else {

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-kick','message': 'vous avez été kick du groupe : ' + msg.group + ' par ' + msg.sender + ' pour la raison suivante : ' + msg.reason});

                                              }

                                        }

                                  }

                                  db.run("DELETE FROM groupeUtilisateur WHERE idUtilisateur = \"" + msg.dest + "\" and idGroupe = \"" + msg.group + "\"");
                                  groupe.removeMembre(msg.dest);

                                  db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a kické " + msg.dest + " pour la raison suivante : " + msg.reason + "\",\"" + msg.group + "\")");
                                  groupe.addEvenement(msg.sender + ' a kické ' + msg.dest + ' pour la raison suivante : ' + msg.reason);

                            } else {

                                  socket.emit('message',{'action':'server-kick','message':msg.dest + ' n\'est pas dans le groupe : ' + msg.group});

                            }

                      } else {

                            socket.emit('message',{'action':'server-kick','message':'aucun groupe correspondant à ' + msg.group + ' ou vous ne faites pas partie du groupe'});

                      }

                      break;

                case 'ban':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            if(groupe.hasMembre(msg.dest)){

                                  let listeMembres = groupe.getListeMembres();

                                  for(let i = 0; i < listeMembres.length;i++){

                                        if(tabSocket[listeMembres[i]] !== undefined){

                                              if(listeMembres[i] !== msg.dest && listeMembres[i] !== msg.sender){

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-ban','message': msg.dest + ' a été bannis du groupe : ' + msg.group + ' par ' + msg.sender + ' pour la raison suivante : ' + msg.reason});

                                              } else if(listeMembres[i] === msg.sender){

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-ban','message': 'vous avez bannis ' + msg.dest + ' du groupe : ' + msg.group + ' pour la raison suivante : ' + msg.reason});

                                              }else {

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-ban','message': 'vous avez été bannis du groupe : ' + msg.group + ' par ' + msg.sender + ' pour la raison suivante : ' + msg.reason});

                                              }

                                        }

                                  }

                                  db.run("DELETE FROM groupeUtilisateur WHERE idUtilisateur = \"" + msg.dest + "\" and idGroupe = \"" + msg.group + "\"");
                                  db.run("INSERT INTO groupeBannis VALUES(\"" + msg.dest + "\",\"" + msg.group + "\")");
                                  groupe.banMembre(msg.dest);

                                  db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a bannis " + msg.dest + " pour la raison suivante : " + msg.reason + "\",\"" + msg.group + "\")");
                                  groupe.addEvenement(msg.sender + ' a bannis ' + msg.dest + ' pour la raison suivante : ' + msg.reason);

                            } else {

                                  socket.emit('message',{'action':'server-ban','message':msg.dest + ' n\'est pas dans le groupe : ' + msg.group});

                            }

                      } else {

                            socket.emit('message',{'action':'server-ban','message':'aucun groupe correspondant à ' + msg.group + ' ou vous ne faites pas partie du groupe'});

                      }

                      break;

                case 'unban':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            let listeMembres = groupe.getListeMembres();

                            for(let i = 0; i < listeMembres.length;i++){

                                  if(tabSocket[listeMembres[i]] !== undefined){

                                        if(listeMembres[i] !== msg.sender){

                                              tabSocket[listeMembres[i]].emit('message',{'action':'server-unban','message': msg.dest + ' a été débannis du groupe : ' + msg.group + ' par ' + msg.sender});

                                        } else {

                                              tabSocket[listeMembres[i]].emit('message',{'action':'server-unban','message': 'vous avez débannis ' + msg.dest + ' du groupe : ' + msg.group});

                                        }

                                  }

                            }

                            tabSocket[msg.dest].emit('message',{'action':'server-unban','message': 'vous avez été débannis du groupe : ' + msg.group + ' par ' + msg.sender});

                            db.run("DELETE FROM groupeBannis WHERE idUtilisateur = \"" + msg.dest + "\" and idGroupe = \"" + msg.group + "\"");
                            groupe.unbanMembre(msg.dest);

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a débannis " + msg.dest + " pour la raison suivante : " + msg.reason + "\",\"" + msg.group + "\")");
                            groupe.addEvenement(msg.sender + ' a débannis ' + msg.dest);

                      } else {

                            socket.emit('message',{'action':'server-unban','message':'aucun groupe correspondant à ' + msg.group + ' ou vous ne faites pas partie du groupe'});

                      }

                      break;

                case 'states':

                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined && groupe.hasMembre(msg.sender)){

                            let listeMessages = groupe.getListeEvenements();
                            let listeNomsMessages = "Liste des evenements de " + msg.group + ' : ';

                            for(let i = 0; i < listeMessages.length; i++){

                                  listeNomsMessages += "\n>\t" + listeMessages[i];

                            }

                            socket.emit('message',{'action':'server-states', 'message' : listeNomsMessages});

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + "consultation des evenements par " + msg.sender + "\",\"" + msg.group + "\")");
                            groupe.addEvenement('consultation des evenements par ' + msg.sender);

                      } else {

                            socket.emit('message',{'action':'server-states','message':'aucun groupe correspondant à ' + msg.group + ' ou alors vous ne faites pas partie du groupe'});

                      }
                      break;

                case 'cgroupeprive':

                      groupe = new Groupe(msg.group,msg.sender,false);

                      db.run("INSERT INTO groupe VALUES(\"" + msg.group + "\",\"" + msg.sender + "\",false)");
                      db.run("INSERT INTO groupeUtilisateur VALUES(\"" + msg.sender + "\",\"" + msg.group + "\")");

                      if(listeGroupes.get(groupe) === undefined){

                            listeGroupes.add(groupe);

                            for(let tmpSocket in tabSocket){

                                  if(tmpSocket !== msg.sender){

                                        tabSocket[tmpSocket].emit('message',{'action':'server-cgroupeprive','message': msg.sender + ' a crée le groupe privé : ' + msg.group});

                                  } else {

                                        tabSocket[tmpSocket].emit('message',{'action':'server-cgroupeprive','message':'Vous avez crée le groupe privé : ' + msg.group});

                                  }

                            }

                            db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + "création du groupe " + "\",\"" + msg.group + "\")");
                            groupe.addEvenement('création du groupe');

                      } else {

                            socket.emit('message',{'action':'server-cgroupeprive','message':'Un groupe porte déjà le nom : ' + msg.group});

                      }

                      break;

                case 'joinpr':
                      groupe = listeGroupes.get(msg.group);

                      if(groupe !== undefined){

                            if(groupe.addMembre(msg.sender)){

                                  db.run("INSERT INTO groupeUtilisateur VALUES(\"" + msg.sender + "\",\"" + msg.group + "\")");

                                  let listeMembres = groupe.getListeMembres();

                                  for(let i = 0; i < listeMembres.length;i++){

                                        if(tabSocket[listeMembres[i]] !== undefined){

                                              if(listeMembres[i] !== msg.sender){

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-joinpr','message': msg.sender + ' a rejoint le groupe : ' + msg.group});

                                              } else {

                                                    tabSocket[listeMembres[i]].emit('message',{'action':'server-joinpr','message':'vous avez rejoint le groupe : ' + msg.group});

                                              }

                                        }

                                  }

                                  db.run("INSERT INTO groupeEvenement(text,idGroupe) VALUES(\"" + msg.sender + " a rejoint le groupe" + "\",\"" + msg.group + "\")");
                                  groupe.addEvenement(msg.sender + ' a rejoint le groupe');

                            } else {

                                  socket.emit('message',{'action':'server-joinpr','message':'vous êtes bannis ou déjà dans le groupe : ' + msg.group});

                            }

                      } else {

                            socket.emit('message',{'action':'server-join','message':'aucun groupe correspondant à ' + msg.group});

                      }

                      break;

            }

    });

});
