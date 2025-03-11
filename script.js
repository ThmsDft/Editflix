/* ----- Configuration et variables globales ----- */
const config = {
  baseWidth: 600,
  baseHeight: 849,
  scale: 1,
  pageX: 0,
  pageY: 0,
};

let seriesTitle = "";
let photo = null;
let isDraggingPage = false,
  dragStartX,
  dragStartY;
let isPinching = false,
  lastTouchDistance = 0,
  isPanning = false,
  lastTouchPosition = { x: 0, y: 0 };

/* ----- Préchargement des images SVG ----- */
const images = {
  netflix: new Image(),
  hd: new Image(),
  rectangle: new Image(),
  top10: new Image(),
};
images.netflix.src = "./svg/Netflix.svg";
images.hd.src = "./svg/HD.svg";
images.rectangle.src = "./svg/Rectangle.svg";
images.top10.src = "./svg/Top10.svg";
Object.values(images).forEach((img) => {
  img.onload = draw;
});

/* ----- Récupération des éléments du DOM ----- */
const elements = {
  serieTitle: document.getElementById("serie-title"),
  recommendation: document.getElementById("recommendation"),
  year: document.getElementById("year"),
  rectangleNumber: document.getElementById("rectangle-number"),
  rectangleRightText: document.getElementById("rectangle-right-text"),
  storyText: document.getElementById("story-text"),
  distributionText: document.getElementById("distribution-text"),
  genresText: document.getElementById("genres-text"),
  customButton: document.getElementById("custom-button"),
  photoInput: document.getElementById("photo"),
  customText: document.getElementById("custom-text"),
  exportButton: document.getElementById("export-png"),
  closeControls: document.getElementById("close"),
  openControls: document.getElementById("open"),
  controls: document.getElementById("controls"),
};

/* ----- Canvas ----- */
const canvas = document.getElementById("editor");
const ctx = canvas.getContext("2d");

/* ----- Fonctions utilitaires ----- */
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (context.measureText(testLine).width > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
}

function getWrappedLines(context, segments, maxWidth) {
  let words = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      words.push({ text: w, style: seg.style });
    });
  });
  let lines = [];
  let currentLine = [];
  let currentLineWidth = 0;
  const spaceWidth = context.measureText(" ").width;
  words.forEach((word) => {
    const wordWidth = context.measureText(word.text).width;
    const additionalSpace = currentLine.length ? spaceWidth : 0;
    if (
      currentLineWidth + additionalSpace + wordWidth > maxWidth &&
      currentLine.length
    ) {
      lines.push(currentLine);
      currentLine = [];
      currentLineWidth = 0;
    }
    if (currentLine.length) {
      currentLine.push({ text: " ", style: word.style });
      currentLineWidth += spaceWidth;
    }
    currentLine.push(word);
    currentLineWidth += wordWidth;
  });
  if (currentLine.length) lines.push(currentLine);
  return lines;
}

function drawWrappedMultiColorTextTop(
  context,
  segments,
  x,
  topY,
  maxWidth,
  lineHeight
) {
  context.font = "600 " + lineHeight / 1.2 + "px 'Inter', sans-serif";
  const lines = getWrappedLines(context, segments, maxWidth);
  lines.forEach((line, i) => {
    let currentX = x;
    const lineY = topY + i * lineHeight;
    line.forEach((word) => {
      context.fillStyle = word.style;
      context.fillText(word.text, currentX, lineY);
      currentX += context.measureText(word.text).width;
    });
  });
}

/* ----- Fonction de dessin principale ----- */
function drawContent(context, pX, pY, scale) {
  const pageW = config.baseWidth * scale,
    pageH = config.baseHeight * scale;

  // Fond noir
  context.fillStyle = "black";
  context.fillRect(pX, pY, pageW, pageH);

  // Image de fond et dégradé
  if (photo) {
    const targetWidth = pageW,
      targetHeight = pageH * 0.8,
      scaleFactor = Math.max(
        targetWidth / photo.width,
        targetHeight / photo.height
      ),
      imgW = photo.width * scaleFactor,
      imgH = photo.height * scaleFactor,
      imgX = pX + (targetWidth - imgW) / 2,
      imgY = pY + (targetHeight - imgH) / 2;
    context.save();
    context.beginPath();
    context.rect(pX, pY, targetWidth, targetHeight);
    context.clip();
    context.drawImage(photo, imgX, imgY, imgW, imgH);
    context.restore();

    const gradYStart = pY + pageH * 0.3,
      gradYEnd = pY + targetHeight * 1.01;
    let gradient = context.createLinearGradient(pX, gradYStart, pX, gradYEnd);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
    context.fillStyle = gradient;
    context.fillRect(pX, gradYStart, targetWidth, gradYEnd - gradYStart);
  }

  // Titre de la série
  context.save();
  context.rect(pX, pY, pageW, pageH);
  context.clip();
  context.fillStyle = "white";
  context.font = "900 " + 80 * scale + "px 'Inter', sans-serif";
  context.textBaseline = "bottom";
  let margin = 34 * scale;
  context.fillText(seriesTitle, pX + margin, pY + pageH - margin * 8.4);
  context.restore();

  // SVG Netflix
  if (images.netflix.complete && images.netflix.naturalWidth) {
    const marginSvg = 35 * scale,
      desiredSvgWidth = 200 * scale,
      ratio = images.netflix.naturalWidth / images.netflix.naturalHeight,
      desiredSvgHeight = desiredSvgWidth / ratio,
      svgX = pX + marginSvg,
      svgY = pY + pageH - desiredSvgHeight - marginSvg * 7.2;
    context.drawImage(
      images.netflix,
      svgX,
      svgY,
      desiredSvgWidth,
      desiredSvgHeight
    );
  }

  // Texte "Recommandé à XX % YYYY"
  context.save();
  context.font = "600 " + 11 * scale + "px 'Inter', sans-serif";
  context.textBaseline = "bottom";
  const recMargin = 35 * scale,
    recX = pX + recMargin,
    recY = pY + pageH - recMargin * 5.2,
    recText1 = "Recommandé à ",
    recPercentage = elements.recommendation.value || "98",
    recText2 = " %  ",
    recYear = elements.year.value || "2024";
  context.fillStyle = "#45D068";
  context.fillText(recText1, recX, recY);
  const width1 = context.measureText(recText1).width;
  context.fillText(recPercentage, recX + width1, recY);
  const width2 = context.measureText(recPercentage).width;
  context.fillText(recText2, recX + width1 + width2, recY);
  const width3 = context.measureText(recText2).width;
  context.fillStyle = "#B5B5B5";
  context.fillText(recYear, recX + width1 + width2 + width3, recY);
  const widthRecYear = context.measureText(recYear).width;
  context.restore();

  // SVG HD
  if (images.hd.complete && images.hd.naturalWidth) {
    const iconAdditionalMargin = 5 * scale,
      iconX =
        recX + width1 + width2 + width3 + widthRecYear + iconAdditionalMargin,
      iconWidth = 16.3 * scale * 1.3,
      iconHeight =
        iconWidth * (images.hd.naturalHeight / images.hd.naturalWidth),
      iconY = recY - iconHeight * 1.05;
    context.drawImage(images.hd, iconX, iconY, iconWidth, iconHeight);
  }

  // Bloc Distribution
  const distributionWidth = config.baseWidth * 0.28 * scale,
    distributionX = pX + pageW - distributionWidth - recMargin,
    distributionFontSize = 8.8 * scale,
    distributionLineHeight = distributionFontSize * 1.2,
    distributionDynamic = elements.distributionText.value || "",
    distributionSegments = [
      { text: "Distribution :", style: "#5F5F5F" },
      { text: " " + distributionDynamic, style: "#B5B5B5" },
    ],
    distributionTopY = recY - 14 * scale;
  drawWrappedMultiColorTextTop(
    context,
    distributionSegments,
    distributionX,
    distributionTopY,
    distributionWidth,
    distributionLineHeight
  );
  const distributionLines = getWrappedLines(
    context,
    distributionSegments,
    distributionWidth
  );
  const distributionBlockHeight =
    distributionLines.length * distributionLineHeight;

  // Bloc Genres
  const genresDynamic = elements.genresText.value || "",
    genresSegments = [
      { text: "Genres :", style: "#5F5F5F" },
      { text: " " + genresDynamic, style: "#B5B5B5" },
    ],
    genresMargin = 13 * scale,
    genresTopY = distributionTopY + distributionBlockHeight + genresMargin;
  drawWrappedMultiColorTextTop(
    context,
    genresSegments,
    distributionX,
    genresTopY,
    distributionWidth,
    distributionLineHeight
  );

  // Rectangle et textes associés
  if (images.rectangle.complete && images.rectangle.naturalWidth) {
    const rectMarginTop = 5 * scale,
      desiredRectWidth = 100 * scale * 0.28,
      desiredRectHeight =
        desiredRectWidth *
        (images.rectangle.naturalHeight / images.rectangle.naturalWidth),
      rectX = recX,
      rectY = recY + rectMarginTop;
    context.drawImage(
      images.rectangle,
      rectX,
      rectY,
      desiredRectWidth,
      desiredRectHeight
    );
    const rectValue = elements.rectangleNumber.value || "16",
      rectText = rectValue + "+";
    context.save();
    context.font = "bold " + desiredRectHeight * 0.6 + "px 'Inter', sans-serif";
    context.fillStyle = "#B5B5B5";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      rectText,
      rectX + desiredRectWidth / 2,
      rectY + desiredRectHeight / 2
    );
    context.restore();

    const rightText = elements.rectangleRightText.value || "";
    context.save();
    context.font = "600 " + desiredRectHeight * 0.8 + "px 'Inter', sans-serif";
    context.fillStyle = "#B5B5B5";
    context.textAlign = "left";
    context.textBaseline = "middle";
    const marginBetween = 5 * scale;
    context.fillText(
      rightText,
      rectX + desiredRectWidth + marginBetween,
      rectY + desiredRectHeight / 2
    );
    context.restore();

    // Top10 SVG et texte associé
    if (images.top10.complete && images.top10.naturalWidth) {
      const top10MarginTop = 10 * scale,
        top10X = recX,
        top10Y = rectY + desiredRectHeight + top10MarginTop,
        desiredTop10Width = 18 * scale,
        desiredTop10Height =
          desiredTop10Width *
          (images.top10.naturalHeight / images.top10.naturalWidth);
      context.drawImage(
        images.top10,
        top10X,
        top10Y,
        desiredTop10Width,
        desiredTop10Height
      );
      context.save();
      context.font =
        "600 " + desiredTop10Height * 0.72 + "px 'Inter', sans-serif";
      context.fillStyle = "white";
      context.textBaseline = "middle";
      const marginBetweenTop10 = 8 * scale,
        textX = top10X + desiredTop10Width + marginBetweenTop10,
        textY = top10Y + (desiredTop10Height / 2) * 1.1;
      context.fillText("N° 1 des séries TV aujourd’hui", textX, textY);
      context.restore();

      // Bloc d'histoire
      const storyMarginTop = 30 * scale,
        storyX = recX,
        storyY = top10Y + desiredTop10Height + storyMarginTop,
        storyBoxWidth = pageW - recMargin * 8.2,
        storyFontSize = 10 * scale,
        storyLineHeight = storyFontSize * 1.2,
        storyText = elements.storyText.value || "";
      context.save();
      context.font = storyFontSize + "px 'Inter', sans-serif";
      context.fillStyle = "white";
      wrapText(
        context,
        storyText,
        storyX,
        storyY,
        storyBoxWidth,
        storyLineHeight
      );
      context.restore();
    }
  }
}

/* ----- Fonction de dessin et redimensionnement ----- */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#999";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawContent(ctx, config.pageX, config.pageY, config.scale);
}

function resizeCanvas() {
  const container = document.getElementById("canvas-container");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;

  // Définir une marge (par exemple 20px de chaque côté)
  const margin = 20;
  const availableWidth = canvas.width - 2 * margin;
  const availableHeight = canvas.height - 2 * margin;

  // Calculer le scale pour que le A4 tienne dans l'espace disponible
  const scaleWidth = availableWidth / config.baseWidth;
  const scaleHeight = availableHeight / config.baseHeight;
  config.scale = Math.min(scaleWidth, scaleHeight);

  // Centrer le contenu dans le canvas
  config.pageX = (canvas.width - config.baseWidth * config.scale) / 2;
  config.pageY = (canvas.height - config.baseHeight * config.scale) / 2;

  draw();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ----- Événements sur les inputs ----- */
[
  "serieTitle",
  "recommendation",
  "year",
  "rectangleNumber",
  "rectangleRightText",
  "distributionText",
  "genresText",
  "storyText",
].forEach((id) => {
  elements[id].addEventListener("input", () => {
    if (id === "serieTitle") seriesTitle = elements.serieTitle.value || "";
    draw();
  });
});

/* ----- Gestion du bouton fichier personnalisé ----- */
elements.customButton.addEventListener("click", () =>
  elements.photoInput.click()
);
elements.photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    elements.customText.textContent = file.name;
    photo = new Image();
    photo.onload = draw;
    photo.src = URL.createObjectURL(file);
  } else {
    elements.customText.textContent = "Aucun fichier sélectionné";
  }
});

/* ----- Gestion du pan et zoom sur le canvas ----- */
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  isDraggingPage = true;
  dragStartX = mouseX - config.pageX;
  dragStartY = mouseY - config.pageY;
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  if (isDraggingPage) {
    config.pageX = mouseX - dragStartX;
    config.pageY = mouseY - dragStartY;
    draw();
    canvas.style.cursor = "grabbing";
  } else {
    canvas.style.cursor = "grab";
  }
});

canvas.addEventListener("mouseup", () => {
  isDraggingPage = false;
  canvas.style.cursor = "grab";
});
canvas.addEventListener("mouseleave", () => {
  isDraggingPage = false;
  canvas.style.cursor = "grab";
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const zoomAmount = e.deltaY * -0.001;
  const newScale = Math.min(Math.max(config.scale + zoomAmount, 0.1), 3);
  const relX = mouseX - config.pageX;
  const relY = mouseY - config.pageY;
  config.pageX = mouseX - (relX * newScale) / config.scale;
  config.pageY = mouseY - (relY * newScale) / config.scale;
  config.scale = newScale;
  draw();
});

/* --------- Gestion des gestes tactiles (pan & pinch zoom) --------- */
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      isPinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      isPanning = true;
      lastTouchPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  },
  { passive: false }
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (isPinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      const zoomFactor = newDistance / lastTouchDistance;
      lastTouchDistance = newDistance;
      const rect = canvas.getBoundingClientRect();
      const centerX =
        (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerY =
        (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const relX = centerX - config.pageX;
      const relY = centerY - config.pageY;
      const newScale = Math.min(Math.max(config.scale * zoomFactor, 0.1), 3);
      config.pageX = centerX - (relX * newScale) / config.scale;
      config.pageY = centerY - (relY * newScale) / config.scale;
      config.scale = newScale;
      draw();
    } else if (isPanning && e.touches.length === 1) {
      const currentPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      const deltaX = currentPos.x - lastTouchPosition.x;
      const deltaY = currentPos.y - lastTouchPosition.y;
      config.pageX += deltaX;
      config.pageY += deltaY;
      lastTouchPosition = currentPos;
      draw();
    }
  },
  { passive: false }
);
canvas.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) isPinching = false;
  if (e.touches.length < 1) isPanning = false;
});

/* ----- Open & close Controls ----- */
elements.closeControls.addEventListener("click", () => {
  console.log("close");
  elements.controls.classList.add("hidden");
  elements.openControls.classList.remove("hidden");
});

elements.openControls.addEventListener("click", () => {
  console.log("open");
  elements.controls.classList.remove("hidden");
  elements.openControls.classList.add("hidden");
});

/* ----- Export PNG ----- */
elements.exportButton.addEventListener("click", () => {
  const exportMultiplier = 3;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = config.baseWidth * exportMultiplier;
  tempCanvas.height = config.baseHeight * exportMultiplier;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.scale(exportMultiplier, exportMultiplier);
  drawContent(tempCtx, 0, 0, 1);
  const link = document.createElement("a");
  link.href = tempCanvas.toDataURL("image/png");
  link.download = seriesTitle ? `${seriesTitle}.png` : "nextflix.png";
  link.click();
});

/* ----- Chargement des exemples depuis JSON ----- */
window.addEventListener("load", () => {
  fetch("exemples.json")
    .then((response) => response.json())
    .then((data) => {
      const exemples = data.exemples;
      const exempleChoisi =
        exemples[Math.floor(Math.random() * exemples.length)];

      elements.serieTitle.value = exempleChoisi.serieTitle;
      seriesTitle = exempleChoisi.serieTitle;
      elements.recommendation.value = exempleChoisi.recommendation;
      elements.year.value = exempleChoisi.year;
      elements.rectangleNumber.value = exempleChoisi["rectangle-number"];
      elements.rectangleRightText.value = exempleChoisi["rectangle-right-text"];
      elements.storyText.value = exempleChoisi["story-text"];
      elements.distributionText.value = exempleChoisi["distribution-text"];
      elements.genresText.value = exempleChoisi["genres-text"];

      if (exempleChoisi.photo) {
        photo = new Image();
        photo.onload = draw;
        photo.src = exempleChoisi.photo;
      } else {
        photo = null;
        draw();
      }
    })
    .catch((error) => {
      console.error("Erreur lors du chargement des exemples :", error);
      draw();
    });
});
