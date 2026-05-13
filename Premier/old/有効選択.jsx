(function() {
    var seq = app.project.activeSequence;
    if (!seq) { alert("シーケンスを開いてアクティブにしてください。"); return; }

    var selectedClips = seq.getSelection();
    for (var i = 0; i < selectedClips.length; i++) selectedClips[i].setSelected(false, false);

    function processTracks(tracks) {
        for (var t = 0; t < tracks.numTracks; t++) {
            var track = tracks[t];
            if (track.isLocked()) continue;
            var isTrackTargeted = false;
            if (typeof track.isTargeted === "function") isTrackTargeted = track.isTargeted();
            else if (typeof track.isTargeted !== "undefined") isTrackTargeted = track.isTargeted;
            else isTrackTargeted = true;
            if (!isTrackTargeted) continue;

            var clips = track.clips;
            for (var c = 0; c < clips.numItems; c++) {
                var clip = clips[c];
                var isDisabled = false;
                if      (typeof clip.disabled !== "undefined") isDisabled = !!clip.disabled;
                else if (typeof clip.enabled  !== "undefined") isDisabled = !clip.enabled;
                else if (typeof clip.isMuted  === "function")  isDisabled = clip.isMuted();
                else continue;
                if (!isDisabled) clip.setSelected(true, true);
            }
        }
    }

    if (seq.videoTracks) processTracks(seq.videoTracks);
    if (seq.audioTracks) processTracks(seq.audioTracks);
})();
