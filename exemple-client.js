const readline = require('readline');
const lecture = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const debug = require('debug')('true');
const chalk = require('chalk');
const argv = require('yargs').argv;

const crypto = require("crypto");
const client = crypto.createECDH('brainpoolP256r1');
client.generateKeys();

const socketio = require('socket.io-client');
const socket = socketio.connect("http://localhost:3636");
let groupe;

process.stdout.write('> ');

socket.on('message', function(message) {

    debug(chalk.blue(message));

    switch(message.action){

        case 'server-connection':
            console.log(chalk.blue(message.message + '\n'));
            break;

        case 'server-send':
            console.log(chalk.red(message.message + '\n'));
            break;

        case 'server-broadcast':
            console.log(chalk.red(message.message + '\n'));
            break;

        case 'server-list':
            console.log(chalk.blue(message.message + '\n'));
            break;

        case 'server-cgroupe':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-join':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-gbroadcast':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-members':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-msgs':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-groups':
            console.log(chalk.blue(message.message + '\n'));
            break;

        case 'server-leave':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-invite':
            console.log(chalk.green(message.message + '\n'));
            groupe = message.groupe;
            break;

        case 'server-kick':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-ban':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-unban':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-states':
            console.log(chalk.green(message.message + '\n'));
            break;

        case 'server-deconnection':
            console.log(chalk.blue(message.message + '\n'));
            socket.close();
            process.exit();
            break;

        case 'server-deconnection':

            var clientLength = Buffer.from(cleClient, 'base64').length;
            var cleServeurPublic = "RUNLUCAAAAB/xP7JhSIhYIYAijyC2zHu7obB5CwfK/ynQPxcRAIhBI6OLRRcHyPo61AhfSZN3qA2vGDfWO2mrdWWvqqhVaDf";
            var bufferCleServeur = Buffer.from(cleServeurPublic, 'base64');
            var cleServeur = Buffer.alloc(clientLength)
            bufferCleServeur.copy(cleServeur, 1, 8);
            cleServeur[0] = 4;
            const hash = crypto.createHash('sha256');
            var tt = client.computeSecret(cleServeur);

            if(hash.update(tt).digest('base64') === message.cleSecreteServeur){

                  console.log(chalk.blue('Authentification réussi\n'));

            } else {

                  console.log(chalk.blue('Authentification échoué\n'));
                  socket.emit('message',{'action':'server-desauthentification'});
                  socket.close();

            }

            break;

        default:
            console.log(message.message + '\n');
            break;
    }

    process.stdout.write('> ');

});

lecture.on('line', (text) => {

    var tabText = text.split(';');
		switch(tabText[0]){

            case 's':
                    socket.emit('send',{"sender":argv.sendername,"dest":tabText[1],"msg":tabText[2],"action":"client-send"});
                    break;

            case 'b':
                    socket.emit('send',{"sender":argv.sendername,"msg":tabText[1],"action":"client-broadcast"});
                    break

            case 'ls':
                    socket.emit('send',{"sender":argv.sendername,"action":"client-list-clients"});
                    break;

            case 'q':
                    socket.emit('send',{"sender":argv.sendername,"action":"client-quit"});
                    socket.close();
                    process.exit();
                    break;

            case 'cg':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"action":"cgroupe"});
                    break;

            case 'j':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"action":"join"});
                    break;

            case 'bg':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"msg":tabText[2],"action":"gbroadcast"});
                    break;

            case 'members':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],'action':'members'});
                    break;

            case 'messages':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],'action':'msgs'});
                    break;

            case 'groups':
                    socket.emit('send',{"sender":argv.sendername,'action':'groups'});
                    break;

            case 'leave':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],'action':'leave'});
                    break;

            case 'invite':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"dest":tabText[2],'action':'invite'});
                    break;

            case 'oui':
                    socket.emit('send',{"sender":argv.sendername,"group": groupe,'action':'joinpr'});
                    break;

            case 'non':
                    socket.emit('send',{"sender":argv.sendername,"group": groupe,"msg":"n'a pas rejoins le groupe",'action':'gbroadcast'});
                    break;

            case 'kick':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"dest":tabText[2],'reason':tabText[3],'action':'kick'});
                    break;

            case 'ban':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"dest":tabText[2],'reason':tabText[3],'action':'ban'});
                    break;

            case 'unban':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"dest":tabText[2],'action':'unban'});
                    break;

            case 'states':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],'action':'states'});
                    break;

            case 'cgpr':
                    socket.emit('send',{"sender":argv.sendername,"group": tabText[1],"action":"cgroupeprive"});
                    break;

            case 'a':
                    socket.emit('send',{"sender":argv.sendername,"action":"auth","clePublic" : client.getPublicKey('base64')});
                    break;

    }

    process.stdout.write('> ');

});

function main(){

  socket.emit('send',{"sender":argv.sendername,"action":"client-connection",'password':argv.password});

}

main();
