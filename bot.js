'use strict'

var WebSocketClient = require('websocket').client

/**
 * bot ist ein einfacher Websocket Chat Client
 */

class bot {

  /**
   * Konstruktor baut den client auf. Er erstellt einen Websocket und verbindet sich zum Server
   * Bitte beachten Sie, dass die Server IP hardcodiert ist. Sie müssen sie umsetzten
   */
  constructor() {
    this.intents = require("./wissensbasis.json")
    this.history = []
    this.conversation_path = ["reservieren", "einzelzimmer", "wann", "wie lange", "preis", "name", "zusammenfassung"]
    this.nmb_question_path = 0
    this.nmb_default_answer = 0
    this.reservation = {
      "reservieren": null,
      "einzelzimmer": null,
      "wann": null,
      "wie lange": null,
      "preis": null,
      "name": null,
    }

    this.wants_infos = null
    this.nmb_conv_path = 1
    this.reservation_questions_foos = [this.wants_reservation.bind(this), this.handle_einzelzimmer.bind(this), this.handle_wann.bind(this), this.handle_wie_lange.bind(this), this.handle_preis.bind(this), this.handle_name.bind(this), this.reservierungs_zusammenfassung.bind(this)]
    this.nmb_infos_not_understood = -1
    this.nmb_which_info = -1
    this.nmb_default_infos = -1

    /** Die Websocketverbindung
      */
    this.client = new WebSocketClient()
    /**
     * Wenn der Websocket verbunden ist, dann setzten wir ihn auf true
     */
    this.connected = false

    /**
     * Wenn die Verbindung nicht zustande kommt, dann läuft der Aufruf hier hinein
     */
    this.client.on('connectFailed', function (error) {
      console.log('Connect Error: ' + error.toString())
    })

    /** 
     * Wenn der Client sich mit dem Server verbindet sind wir hier 
    */
    this.client.on('connect', function (connection) {
      this.con = connection
      console.log('WebSocket Client Connected')
      connection.on('error', function (error) {
        console.log('Connection Error: ' + error.toString())
      })

      /** 
       * Es kann immer sein, dass sich der Client disconnected 
       * (typischer Weise, wenn der Server nicht mehr da ist)
      */
      connection.on('close', function () {
        console.log('echo-protocol Connection Closed')
      })

      /** 
       *    Hier ist der Kern, wenn immmer eine Nachricht empfangen wird, kommt hier die 
       *    Nachricht an. 
      */
      connection.on('message', function (message) {
        if (message.type === 'utf8') {
          var data = JSON.parse(message.utf8Data)
          console.log('Received: ' + data.msg + ' ' + data.name)
        }
      })

      /** 
       * Hier senden wir unsere Kennung damit der Server uns erkennt.
       * Wir formatieren die Kennung als JSON
      */
      function joinGesp() {
        if (connection.connected) {
          connection.sendUTF('{"type": "join", "name":"HotelBot"}')
        }
      }
      joinGesp()
      var msg = '{"type": "msg", "name": "' + "HotelBot" + '", "msg":"' + "Guten Tag und herzlich willkommen zur Informations- und Reservierungsstelle unseres Hotels! Wollen Sie ein paar Information zu unserem Hotel erfahren, oder gleich eine Reservierung vornehmen?" + '"}'
      console.log('Send: ' + msg)
      connection.sendUTF(msg)
    })
  }

  /**
   * Methode um sich mit dem Server zu verbinden. Achtung wir nutzen localhost
   * 
   */
  connect() {
    this.client.connect('ws://20.50.139.104:8181/', 'chat')
    this.connected = true
  }

  /** 
   * Hier muss ihre Verarbeitungslogik integriert werden.
   * Diese Funktion wird automatisch im Server aufgerufen, wenn etwas ankommt, das wir 
   * nicht geschrieben haben
   * @param nachricht auf die der bot reagieren soll
  */

  handle_einzelzimmer(nachricht) {

    var intent = this.handle_yes_no_foo(nachricht)
    console.log("intent " + intent)

    var inhalt = "KEIN INHALT IN EINZELZIMMER"
    if (intent === true) {
      this.reservation["einzelzimmer"] = true
      this.nmb_conv_path = 2
      inhalt = this.intents.reservieren.einzelzimmer // wants einzelzimmer -next q
    }
    else if (intent === false) {
      this.reservation["einzelzimmer"] = false
      this.nmb_conv_path = 2
      inhalt = this.intents.reservieren.kein_einzelzimmer // wants kein einzelzimmer -next q
    }
    else {
      if (nachricht.includes("einzelzimmer")) {
        this.reservation["einzelzimmer"] = true
        this.nmb_conv_path = 2
        inhalt = this.intents.reservieren.einzelzimmer // wants einzelzimmer -next q
      }
      else if (nachricht.includes("doppelzimmer")) {
        this.reservation["einzelzimmer"] = false
        this.nmb_conv_path = 2
        inhalt = this.intents.reservieren.kein_einzelzimmer // wants kein einzelzimmer -next q
      }
      else {
        inhalt = this.intents.fallbacks[1].einzelzimmer // habe nich verstanden ob er einzelzimmer will
      }
    }
    return inhalt
  }

  handle_yes_no_foo(nachricht) {
    console.log("handle_yes_no 2")
    var answer = null

    var positive = this.is_positive_answer(nachricht)
    var negative = this.is_negative_answer(nachricht)

    if (positive === null && negative === null) {
      return answer
    }
    else if (positive === true && negative === true) {
      return answer
    }
    else if (positive === true && negative === null) {
      answer = true
    }
    else if (positive === null && negative === true) {
      answer = false
    }
    return answer
  }

  is_positive_answer(nachricht) {
    var positive = null
    var positive_answers = ["ja", "yes", "korrekt", "richtig", "jawohl", "genau", "stimmt", "ok", "o.k", "o.k.", "okay", "jup", "jap", "jo"]

    for (var j = 0; j < positive_answers.length; j++) {
      if (nachricht.includes(positive_answers[j])) {
        positive = true
        break
      }
    }
    return positive
  }

  is_negative_answer(nachricht) {
    var negative = null
    var negative_answers = ["nein", "no", "nicht", "falsch", "kein", "keine"]

    for (var j = 0; j < negative_answers.length; j++) {
      if (nachricht.includes(negative_answers[j])) {
        negative = true
        break
      }
    }
    return negative
  }


  get_default_answer() {
    var inhalt = this.intents.default_answers[this.nmb_default_answer]
    this.nmb_default_answer++
    if (this.nmb_default_answer > this.intents.default_answers.length - 1) {
      this.nmb_default_answer = 0
    }

    return inhalt
  }

  get_intent_answer_index(nachricht) {
    var intent_index = null
    var answer_index = null

    for (var j = 0; j < this.intents.answers.length; j++) {
      if (nachricht.includes(this.intents.answers[j].intent)) {
        intent_index = j
        answer_index = j
        break
      }
    }

    return [intent_index, answer_index];
  }

  get_info_intent_answer_index(nachricht) {
    var intent_index = null
    var answer_index = null

    for (var j = 0; j < this.intents.infos.length; j++) {
      if (nachricht.includes(this.intents.infos[j].intent)) {
        intent_index = j
        answer_index = j
        break
      }
    }

    return [intent_index, answer_index];
  }

  get_info_answer(answer_index) {
    return this.intents.infos[answer_index].answer
  }

  get_info_intent(intent_index) {
    console.log("get_info_intent" + intent_index)
    return this.intents.infos[intent_index].intent
  }

  get_answer(answer_index) {
    return this.intents.answers[answer_index].answer
  }

  get_intent(intent_index) {
    return this.intents.answers[intent_index].intent
  }

  check_history(intent, answer_index) {
    var inhalt = null

    for (var j = 0; j < this.history.length; j++) {
      if (this.history.includes(intent)) {
        inhalt = this.get_repitition_answer() + " " + this.get_answer(answer_index)
        break
      }
    }

    if (inhalt === null) {
      this.history.push(intent)
      inhalt = this.get_answer(answer_index)
    }

    return inhalt
  }

  get_repitition_answer() {
    this.nmb_repitition++
    if (this.nmb_repitition > this.intents.repetition.length - 1) {
      this.nmb_repitition = 0
    }
    return this.intents.repetition[this.nmb_repitition]
  }

  get_fallback_answer() {

  }


  wants_reservation(nachricht) {
    var inhalt = "THIS IS A DUMMY FOO"
    return inhalt
  }

  handle_wants_infos(nachricht) {
    if (nachricht.includes("reservieren")) {
      this.wants_infos = false
    }
    else if (nachricht.includes("informationen")) {
      this.wants_infos = true
    }
  }

  lead_reservation(nachricht) {
    var inhalt = null

    if (this.nmb_conv_path === 100) {
      inhalt = "Vielen Dank für Ihre Reservierung und noch einen schönen Tag!" // no more infos/reservierung, we are done
    }
    else {
      inhalt = this.reservation_questions_foos[this.nmb_conv_path](nachricht)
    }
    return inhalt
  }

  reservierungs_zusammenfassung(nachricht) {
    var einzelzimmer = this.reservation["einzelzimmer"]
    if (einzelzimmer === true) {
      einzelzimmer = "ein Einzelzimmer"
    }
    else {
      einzelzimmer = "ein Doppelzimmer"
    }

    var wann = this.reservation["wann"]
    var wie_lange = this.reservation["wie lange"]

    var preis = this.reservation["preis"]
    var name = this.reservation["name"]

    var inhalt = "Ich habe folgende Reservierung eingetragen: Sie wünschen " + einzelzimmer + ", werden " + wann + " anreisen und " + wie_lange + " Tage im " + preis + "-Modell bleiben. Ihr Name lautet " + name
    inhalt = inhalt + ". Ich wünsche Ihnen einen schönen Aufenthalt bei uns " + name + "!"
    this.nmb_conv_path = 100  // no more conversation
    return inhalt
  }

  handle_name(nachricht) {
    var name = this.find_name(nachricht)
    console.log("handle name " + name)
    var inhalt = null
    if (name === null) {
      inhalt = this.intents.reservieren.name_nicht_verstanden // kein name gefunden - ask again
    }
    else {
      this.reservation["name"] = name
      this.nmb_conv_path = 6
      console.log("handle name 2" + name)
      inhalt = "Ihr Name ist also " + name
      inhalt = inhalt + ". " + this.reservierungs_zusammenfassung(nachricht)
    }
    return inhalt
  }

  find_name(nachricht) {
    var splitted = nachricht.split(" ")
    var name = null

    if (splitted.length === 1) {
      name = splitted[0]
    }
    else if (splitted.length === 2) {
      name = splitted[0] + " " + splitted[1]
    }
    else if (splitted.length > 2) {
      name = splitted[splitted.length - 1]
    }
    else {
      name = null
    }
    console.log("find_name " + name)
    return name
  }

  find_einzelzimmer(nachricht) {
    console.log("handle_yes_no 2")
    var answer = null

    var positive = this.is_positive_answer(nachricht)
    var negative = this.is_negative_answer(nachricht)

    if (positive === null && negative === null) {
      return answer
    }
    else if (positive === true && negative === true) {
      return answer
    }
    else if (positive === true && negative === null) {
      answer = "positive"
    }
    else if (positive === null && negative === true) {
      answer = "negative"
    }

    else {
      throw ("neither of neutral, postive, negative in foo get_answer_type")
    }

    return answer

  }

  handle_preis(nachricht) {
    var preis = this.find_preis(nachricht)
    var inhalt = null
    if (preis === null) {
      inhalt = this.intents.reservieren.preis_nicht_verstanden // kein preis gefunden ask again
    }
    else {
      this.reservation['preis'] = preis
      this.nmb_conv_path = 5
      inhalt = "Ok Sie wählen also das " + preis + this.intents.reservieren.preis // sie wählen das preis modell + next q
    }
    return inhalt
  }

  find_preis(nachricht) {
    var preise = ["günstigste", "mittelklasse", "suite"]
    var inhalt = null
    for (var j = 0; j < preise.length; j++) {
      if (nachricht.includes(preise[j])) {
        inhalt = preise[j]
        break
      }
    }
    return inhalt
  }

  handle_wie_lange(nachricht) {
    var inhalt = "KEIN WIE LANGE"
    var numbers = this.find_number(nachricht)
    if (numbers === null) {
      inhalt = this.intents.reservieren.wie_lange_nicht_verstanden // habe keine nummern gefunden
    }
    else {
      this.reservation["wie lange"] = numbers
      this.nmb_conv_path = 4
      inhalt = "Ok Sie wollen also " + numbers + this.intents.reservieren.wie_lange // nummer gefunden
    }
    return inhalt
  }

  find_number(nachricht) {
    var numbers = nachricht.match(/\d+/)

    if (numbers === null) {
      numbers = null
    }
    else {
      numbers = numbers[0]
    }
    return numbers
  }

  handle_wann(nachricht) {
    var inhalt = "KEIN WANN INHALT"
    var res = this.find_date(nachricht)
    var datum = res[0]
    var weekday = res[1]

    var result = " "
    if (weekday !== null) {
      result = result + weekday + " "
    }
    if (datum !== null) {
      result = result + datum
    }
    if (result === " ") {
      inhalt = this.intents.reservieren.wann_nicht_verstanden // habe kein datum erkannt..
    }
    else {
      inhalt = "Ok Sie wollen also " + result + this.intents.reservieren.wann // habe datum erkannt
      this.reservation["wann"] = result
      this.nmb_conv_path = 3
    }
    return inhalt
  }

  find_date(nachricht) {
    var datum = nachricht.match(/\d{2}([\/.-])\d{2}\1\d{4}/g)
    if (datum === null) {
      datum = null
    }
    else {
      datum = datum[0]  // only take first found date
    }

    var weekday = null
    var weekdays = ["heute", "jetzt", "morgen", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"]
    for (var j = 0; j < weekdays.length; j++) {
      if (nachricht.includes(weekdays[j])) {
        weekday = weekdays[j]
      }
    }

    return [datum, weekday]
  }

  get_infos_not_understood_answer() {
    this.nmb_infos_not_understood++
    if (this.nmb_infos_not_understood > this.intents.default_infos[0].not_understood.length - 1) {
      this.nmb_infos_not_understood = 0
    }
    return this.intents.default_infos[0].not_understood[this.nmb_infos_not_understood]
  }

  get_wants_infos_answer() {
    this.nmb_which_info++
    if (this.nmb_which_info > this.intents.default_infos[1].which_info.length - 1) {
      this.nmb_which_info = 0
    }
    return this.intents.default_infos[1].which_info[this.nmb_which_info]
  }

  get_default_info() {
    this.nmb_default_infos++
    if (this.nmb_default_infos > this.intents.default_infos[3].default_infos.length - 1) {
      this.nmb_default_infos = 0
    }
    return this.intents.default_infos[3].default_infos[this.nmb_default_infos]
  }

  post(nachricht) {
    console.log("POST" + this.reservation)
    nachricht = nachricht.toLowerCase()

    var name = 'HotelBot'
    var inhalt = null
    var intent = null
    var indexes = this.get_intent_answer_index(nachricht)
    var intent_index = indexes[0]
    var answer_index = indexes[1]

    if (this.wants_infos === null) {                           // dont know yet if user wants infos or to reservate
      this.handle_wants_infos(nachricht)
      if (this.wants_infos === true) {
        inhalt = this.get_wants_infos_answer()                 // user wants infos - ask which infos
      }
      else if (this.wants_infos === false) {
        inhalt = this.intents.default_infos[2].enough_infos[0]    // user wants reservieren
      }
      else {
        inhalt = this.get_infos_not_understood_answer()        // didn't understand if user wants infos or to reservate
      }
    }

    else if (this.wants_infos === true) {                      // user wird gerade informiert
      var indexes = this.get_info_intent_answer_index(nachricht)
      var intent_index = indexes[0]
      var answer_index = indexes[1]
      var intent = null

      if (intent_index !== null) {
        intent = this.get_info_intent(intent_index)
      }

      if (intent === "reservieren") {                          // user has enough info -- wants reservieren
        this.wants_infos = false
        this.reservation["reservieren"] = true
        this.nmb_conv_path = 1
        inhalt = this.intents.infos[0].answer
      }
      else if (intent === null) {
        inhalt = this.get_default_info()                        // didn't understood user, provide default info
      }
      else {
        inhalt = this.intents.infos[intent_index].answer       // intents.infos[intent]
      }
    }

    else {                                                     // user reserviert gerade
      inhalt = this.lead_reservation(nachricht)
    }


    /*
     * Verarbeitung
    */

    var msg = '{"type": "msg", "name": "' + name + '", "msg":"' + inhalt + '"}'
    console.log('Send: ' + msg)
    this.client.con.sendUTF(msg)
  }

}

module.exports = bot

