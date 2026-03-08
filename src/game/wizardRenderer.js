// Renders the wizard face/body behind the beard area

export function drawWizardFace(ctx, canvasWidth, canvasHeight, beardOffsetY, emotion = 'neutral') {
  const cx = canvasWidth / 2;
  const faceY = beardOffsetY - 10;
  const faceW = canvasWidth * 0.45;
  const faceH = canvasWidth * 0.35;

  // Hat
  drawWizardHat(ctx, cx, faceY - faceH * 0.45, faceW);

  // Face (oval)
  const skinColor = getSkinColor(emotion);
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(cx, faceY, faceW / 2, faceH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face outline
  ctx.strokeStyle = '#5a4030';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ears
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(cx - faceW / 2 - 5, faceY, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + faceW / 2 + 5, faceY, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyes
  drawEyes(ctx, cx, faceY - faceH * 0.1, faceW, emotion);

  // Nose
  ctx.fillStyle = '#c99070';
  ctx.beginPath();
  ctx.moveTo(cx - 5, faceY + 5);
  ctx.lineTo(cx + 5, faceY + 5);
  ctx.lineTo(cx, faceY + 15);
  ctx.closePath();
  ctx.fill();

  // Eyebrows
  drawEyebrows(ctx, cx, faceY - faceH * 0.25, faceW, emotion);

  // Steam if angry
  if (emotion === 'furious') {
    drawSteam(ctx, cx - faceW / 2 - 10, faceY - 10);
    drawSteam(ctx, cx + faceW / 2 + 10, faceY - 10);
  }
}

function getSkinColor(emotion) {
  switch (emotion) {
    case 'furious': return '#e74c3c';
    case 'angry': return '#e88070';
    case 'upset': return '#e8a090';
    case 'happy': return '#f0c0a0';
    case 'ecstatic': return '#f0d0b0';
    default: return '#e8b898';
  }
}

function drawWizardHat(ctx, cx, topY, faceW) {
  const hatBase = topY + 10;
  const hatTop = topY - 60;
  const hatBrimW = faceW * 0.8;

  // Brim
  ctx.fillStyle = '#2c1654';
  ctx.beginPath();
  ctx.ellipse(cx, hatBase + 5, hatBrimW / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cone
  ctx.fillStyle = '#3d1f6d';
  ctx.beginPath();
  ctx.moveTo(cx - faceW * 0.3, hatBase);
  ctx.lineTo(cx + 5, hatTop);
  ctx.lineTo(cx + faceW * 0.3, hatBase);
  ctx.closePath();
  ctx.fill();

  // Hat band
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(cx - faceW * 0.28, hatBase - 5, faceW * 0.56, 8);

  // Star on hat
  ctx.fillStyle = '#f0d060';
  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', cx, hatTop + 25);

  // Brim front
  ctx.fillStyle = '#2c1654';
  ctx.beginPath();
  ctx.ellipse(cx, hatBase, hatBrimW / 2, 6, 0, 0, Math.PI);
  ctx.fill();
}

function drawEyes(ctx, cx, eyeY, faceW, emotion) {
  const eyeSpacing = faceW * 0.22;
  const eyeSize = 8;

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeSpacing;

    // Eye white
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeSize + 2, eyeSize, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pupil
    let pupilOff = 0;
    if (emotion === 'furious' || emotion === 'angry') {
      pupilOff = side * -2; // Cross-eyed when angry
    }

    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(ex + pupilOff, eyeY + 1, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + pupilOff - 1.5, eyeY - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Angry squint
    if (emotion === 'furious' || emotion === 'angry') {
      ctx.fillStyle = getSkinColor(emotion);
      ctx.fillRect(ex - eyeSize - 3, eyeY - eyeSize - 2, (eyeSize + 3) * 2, eyeSize * 0.7);
    } else if (emotion === 'ecstatic') {
      // Happy squint (closed eyes, big smile)
      ctx.fillStyle = getSkinColor(emotion);
      ctx.fillRect(ex - eyeSize - 3, eyeY - eyeSize - 2, (eyeSize + 3) * 2, eyeSize * 0.4);
    }
  }

  // Tears if upset
  if (emotion === 'upset' || emotion === 'angry') {
    ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
    for (const side of [-1, 1]) {
      const ex = cx + side * faceW * 0.22;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY + 12, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEyebrows(ctx, cx, browY, faceW, emotion) {
  const browSpacing = faceW * 0.22;
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (const side of [-1, 1]) {
    const bx = cx + side * browSpacing;
    ctx.beginPath();

    if (emotion === 'furious' || emotion === 'angry') {
      // Angry V brows
      ctx.moveTo(bx - side * 12, browY - 5);
      ctx.lineTo(bx + side * 5, browY + 5);
    } else if (emotion === 'happy' || emotion === 'ecstatic') {
      // Raised happy brows
      ctx.moveTo(bx - 10, browY + 2);
      ctx.quadraticCurveTo(bx, browY - 8, bx + 10, browY + 2);
    } else if (emotion === 'upset') {
      // Worried brows
      ctx.moveTo(bx - side * 10, browY + 4);
      ctx.lineTo(bx + side * 10, browY - 2);
    } else {
      // Neutral
      ctx.moveTo(bx - 10, browY);
      ctx.lineTo(bx + 10, browY);
    }
    ctx.stroke();
  }
}

function drawSteam(ctx, x, y) {
  ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
  const time = Date.now() * 0.003;
  for (let i = 0; i < 3; i++) {
    const offset = Math.sin(time + i * 2) * 5;
    const yOff = -i * 12 - ((time * 5) % 15);
    const size = 5 + i * 2;
    ctx.beginPath();
    ctx.arc(x + offset, y + yOff, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function getEmotionFromScore(score) {
  if (score >= 90) return 'ecstatic';
  if (score >= 70) return 'happy';
  if (score >= 50) return 'neutral';
  if (score >= 30) return 'upset';
  if (score >= 15) return 'angry';
  return 'furious';
}

export function getEmotionEmoji(emotion) {
  switch (emotion) {
    case 'ecstatic': return '🤩';
    case 'happy': return '😊';
    case 'neutral': return '😐';
    case 'upset': return '😢';
    case 'angry': return '😤';
    case 'furious': return '🤬';
    default: return '😐';
  }
}

export function getReactionText(emotion) {
  const reactions = {
    ecstatic: [
      "By Merlin's beard! PERFECTION!",
      "You are the greatest barber in all the realms!",
      "I shall tell the Grand Council of your skill!",
    ],
    happy: [
      "Splendid work, my good barber!",
      "The enchantments will flow much better now!",
      "Most satisfactory indeed!",
    ],
    neutral: [
      "Hmm... it'll do, I suppose.",
      "Not quite what I envisioned, but passable.",
      "I've seen worse... in the troll barber shops.",
    ],
    upset: [
      "*sniff* My beautiful beard...",
      "This is NOT what I asked for! *wipes tear*",
      "How will I face the wizard council like THIS?!",
    ],
    angry: [
      "You BUTCHERED my beard!! *steam hisses*",
      "I should turn you into a TOAD!",
      "UNACCEPTABLE! My beard was LEGENDARY!",
    ],
    furious: [
      "MY BEARD!!! YOU SHAVED IT ALL OFF!!!",
      "I WILL RAIN FIRE UPON THIS SHOP!!!",
      "YOU DARE DEFILE A WIZARD'S BEARD?! PREPARE FOR CONSEQUENCES!!!",
    ],
  };
  const options = reactions[emotion] || reactions.neutral;
  return options[Math.floor(Math.random() * options.length)];
}
