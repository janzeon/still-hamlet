var basicTimeline = anime.timeline({
  autoplay: false
});

var pathEls = $(".check");
for (var i = 0; i < pathEls.length; i++) {
  var pathEl = pathEls[i];
  var offset = anime.setDashoffset(pathEl);
  pathEl.setAttribute("stroke-dashoffset", offset);
}

basicTimeline
  .add({
    targets: ".text",
    duration: 1,
    opacity: "0"
  })
.add({
    targets: ".text2",
    duration: 1,
    opacity: "0"
  })
.add({
    targets: ".buttons",
    duration: 1000,
    translateY: function(el) {
        return [el.getAttribute('y'), 25];
    },
    duration: 500,
    height: 20,
    width: 300,
    backgroundColor: "#2B2D2F",
    border: "0",
    borderRadius: 100,
    elasticity: 0,
  })
  .add({
    targets: ".buttons",

  })
  .add({
    targets: ".progress-bar",
    duration: 500,
    width: 300,
    easing: "linear"
  })
  .add({
    targets: ".button",
    width: 0,
    duration: 1
  })
.add({
    targets: ".button2",
    width: 0,
    duration: 1
  })
  .add({
    targets: ".progress-bar",
    width: 80,
    height: 80,
    delay: 500,
    duration: 750,
    borderRadius: 80,
    backgroundColor: "#71DFBE",
  })
  .add({
    targets: pathEl,
    strokeDashoffset: [offset, 0],
    duration: 200,
    easing: "easeInOutSine"
  });

$(".button").click(function() {
  basicTimeline.play();
});
$(".button2").click(function() {
  basicTimeline.play();
});

$(".text").click(function() {
  basicTimeline.play();
});