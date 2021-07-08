exports.handler =  async function (context, event, callback) {
    const client = context.getTwilioClient();
    let twiml = new Twilio.twiml.VoiceResponse();
    const baseUrl = context.BASEURLSRV;
    const state = event.state;
    const primary = event.number1;
    const secondary = event.number2;
    OrigCallSid = event.OrigCallSid;

    var callbackUrl = `${baseUrl}/statusCallback?OrigCallSid=${OrigCallSid}&state=secondary&number1=${encodeURIComponent(primary)}&number2=${encodeURIComponent(secondary)}`;
    if ((event.CallStatus === 'no-answer') || (event.CallStatus === 'failed') || (event.CallStatus === 'busy') || (event.CallStatus === 'canceled')){
        machineAnswer();
    }
    else if(event.CallStatus === 'completed'){
        callback(null);
    }
    else if (event.AnsweredBy === 'unknown' || event.AnsweredBy === 'human' ){
        humanAnswer();
    }
    else if(event.AnsweredBy === 'fax' || event.AnsweredBy === 'machine_start' || event.AnsweredBy === "machine_end_beep" || event.AnsweredBy === "machine_end_silence" || event.AnsweredBy === "machine_end_other") {
        machineAnswer();
    }
    else{
        console.log("unknown - assuming human answered");
        humanAnswer();
    }

    function humanAnswer() {
        if (state === "primary") {
            twiml.say({
                voice:'Polly.Nicole',
                language: 'en-AU'
            }, 'You are the primary on-call. Please wait while we connect you');
            twiml.dial({
                record: 'record-from-ringing-dual'
            }).conference({
                startConferenceOnEnter: true,
                endConferenceOnExit: true,
                region: 'au1',
                beep: true
            }, OrigCallSid); 
            callback(null, twiml);
        } else {
            client.messages.create({
                body: `Missed Call. Contacted Secondary on: ${secondary}`,
                from: 'On-Call',
                to: primary
            }).catch(error => {
                    let msg = `Error informing primary: ${error}`;
                    console.log(msg);
            });
            twiml.say({
                voice:'Polly.Nicole',
                language: 'en-AU'
            }, 'On-Call. You are the secondary. Please wait while we connect you');
            twiml.dial({
                record: 'record-from-ringing-dual'
            }).conference({
                startConferenceOnEnter: true,
                endConferenceOnExit:  true,
                region: 'au1',
                beep: true
            }, OrigCallSid);
            
        }
    }

    async function machineAnswer() {
        console.log('Machine Answered ' + state);
        if ((state === "primary") && secondary){
            console.log('Primary hit Voicemail... trying the secondary on number ' + secondary);
             callbackUrl = `${baseUrl}/statusCallback?OrigCallSid=${OrigCallSid}&state=secondary&number1=${encodeURIComponent(primary)}&number2=${encodeURIComponent(secondary)}`;
            client.calls.create({
                from: event.From,
                to: secondary,
                url: callbackUrl,
                statusCallback: callbackUrl,
                statusCallbackMethod: 'POST',
                method: "POST",
                machineDetection: "Enable",
                machineDetectionTimeout:"10",
                timeout:30
            }).then(() => {
                let msg = 'Passing to Second person';
                console.log(msg);
                callback(null, twiml);
            }).catch((error => {
                console.log(`Error: ${error}`);
                callback(error);
             }
            ));
        } else {
            await client.calls(OrigCallSid)
            .update({twiml: '<Response><Say>Unable to contact on-call. Goodbye!</Say></Response>'});
            callback(null);          
        }
    }
}