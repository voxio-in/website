// The call XML a new flow starts with: the carrier records the call and streams
// its audio to the call service. The call service has no fallback, so a flow
// with no XML can't take phone calls (it fails parsing an empty string).

export const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Record
        action="https://gpu.call.voxio.in/plivo/recording"
        redirect="false"
        recordSession="true"
        maxLength="28800"
        fileFormat="wav"
        callbackUrl="https://gpu.call.voxio.in/plivo/recording/cb" />

    <Stream
        streamTimeout="3600"
        keepCallAlive="true"
        bidirectional="true"
        contentType="audio/x-l16;rate=16000"
        statusCallbackUrl="https://gpu.call.voxio.in/plivo/status/cb">
        wss://gpu.call.voxio.in/plivo/ws
    </Stream>

    <Wait length="3600"/>
</Response>`
