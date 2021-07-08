var twilio = require('twilio');

exports.handler = async function (context, event, callback) {
    var client = new twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);
    const baseUrl = context.BASEURLSRV;
    const OrigCallSid = event.CallSid;

    const params = `OrigCallSid=${OrigCallSid}`;
    let primary = context.Primary;
    let secondary = context.Secondary;

    let callbackURL = `${baseUrl}/statusCallback?state=primary&number2=${encodeURIComponent(secondary)}&${params}&number1=${encodeURIComponent(primary)}`;
    
    client.calls.create({
        from: context.from,
        to: primary,
        url: callbackURL,
        statusCallback: callbackURL,
        statusCallbackMethod: 'POST',
        method: "POST",
        machineDetection: "Enable",
        machineDetectionTimeout:"10",
        timeout:30
    }).then(call => { 
        let twiml = new Twilio.twiml.VoiceResponse();
        twiml.say({ language: 'en-AU', voice:'Polly.Nicole' }, 'On-Call. Attempting to contact primary. Please wait until we connect you');
        twiml.dial({record: 'record-from-ringing'}).conference({
            startConferenceOnEnter: true,
            endConferenceOnExit: true,
            region: 'au1',
            beep: true,
            waitUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
        }, OrigCallSid);
        callback(null, twiml);
    })
    .catch(error => 
    {   
        callback(error);
    });

};

