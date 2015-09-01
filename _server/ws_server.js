#!/usr/bin/env node

// wie viele Clients sind verbunden?
var numberOfConnections = 0;

// Array aller connections
var connections = [];

// benötige Module für Node.JS
var WebSocketServer = require('websocket').server;
var http = require('http');

// Fehlermeldung bei Aufruf des HTTP-Servers, wir brauchen aber einen HTTP-Server als Grundlage für die WS
var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    // 404 = Fehlercode = Nicht gefunden
    response.writeHead(404);
    response.end();
});

// wartet auf Nachrichten an Port 8080
server.listen(8080, function() {
    // wird bei binden auf den port ausgeführt (1x)
    console.log((new Date()) + ' Server is listening on port 8080');
});

// öffnen des Websocket-Servers
var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false    // manuelles request.accept (Line 45)
});

function originIsAllowed(origin) {
    // Prüfen ob origin(Herkunft) vertraunswürdig ist / auf Websocket zugreifen darf
  return true; // momentan: wir lassen alle zu
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // wenn Client nicht auf WebSocketServer zugreifen darf
      request.reject(); // lehne Verbindung ab
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.'); // logge Datum und Verbindungsaherkunft
      return; // Funktion wsServer.on('request') verlassen
    }

    // Verbindung aufbauen/akzeptieren
    var connection = request.accept('echo-protocol', request.origin);

    numberOfConnections++;
    // neue Connection zum Array hinzufügen
    connections.push(connection);
    // loggen
    console.log((new Date()) + ' Connection accepted.');

    // an sich verbindenen Client Accept-Message senden (UTF-8 Zeichenkodierung)
    connection.sendUTF("Connection was established");

    // immer wenn der Client an den Server Nachricht senden
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            if (message.utf8Data == '/status') {
                connection.sendUTF('Number of open Connections: ' + numberOfConnections);
            } else if (message.utf8Data == '/date') {
                connection.sendUTF(new Date());
            } else if (message.utf8Data == '/serverClose') {
                // Verbindung wird vom Server geschlossen
                connection.close();
            } else if (message.utf8Data == '/humanFirewall') {
                // schließt alle Verbindungen
                for (var i=0; i < connections.length; i++) {
                    connections[i].close();
                }
            } else {
                // normale Nachrichtenverarbeitung
                for (var i=0; i < connections.length; i++) {
                    // senden der Nachricht an alle verbindungen, außer die eigene
                    if(connection != connections[i]) {
                        connections[i].sendUTF(message.utf8Data);
                    }
                }
            }
        }
    });

    // wird aufgerufen, wenn die Verbindung wie auch immer geschlossen wird
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' one Client disconnected.');
        numberOfConnections--;
    });
});
