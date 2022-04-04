var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/node.js
var node_exports = {};
__export(node_exports, {
  generateLut: () => generateLut_default,
  getLut: () => getLut_default
});
module.exports = __toCommonJS(node_exports);

// src/internal/getModalityLUT.js
function generateLinearModalityLUT(slope, intercept) {
  return (storedPixelValue) => storedPixelValue * slope + intercept;
}
function generateNonLinearModalityLUT(modalityLUT) {
  const minValue = modalityLUT.lut[0];
  const maxValue = modalityLUT.lut[modalityLUT.lut.length - 1];
  const maxValueMapped = modalityLUT.firstValueMapped + modalityLUT.lut.length;
  return (storedPixelValue) => {
    if (storedPixelValue < modalityLUT.firstValueMapped) {
      return minValue;
    } else if (storedPixelValue >= maxValueMapped) {
      return maxValue;
    }
    return modalityLUT.lut[storedPixelValue];
  };
}
function getModalityLUT_default(slope, intercept, modalityLUT) {
  if (modalityLUT) {
    return generateNonLinearModalityLUT(modalityLUT);
  }
  return generateLinearModalityLUT(slope, intercept);
}

// src/internal/getVOILut.js
function generateLinearVOILUT(windowWidth, windowCenter) {
  return function(modalityLutValue) {
    return ((modalityLutValue - windowCenter) / windowWidth + 0.5) * 255;
  };
}
function generateNonLinearVOILUT(voiLUT, roundModalityLUTValues) {
  const bitsPerEntry = Math.max(...voiLUT.lut).toString(2).length;
  const shift = bitsPerEntry - 8;
  const minValue = voiLUT.lut[0] >> shift;
  const maxValue = voiLUT.lut[voiLUT.lut.length - 1] >> shift;
  const maxValueMapped = voiLUT.firstValueMapped + voiLUT.lut.length - 1;
  return function(modalityLutValue) {
    if (modalityLutValue < voiLUT.firstValueMapped) {
      return minValue;
    } else if (modalityLutValue >= maxValueMapped) {
      return maxValue;
    }
    if (roundModalityLUTValues) {
      return voiLUT.lut[Math.round(modalityLutValue) - voiLUT.firstValueMapped] >> shift;
    }
    return voiLUT.lut[modalityLutValue - voiLUT.firstValueMapped] >> shift;
  };
}
function getVOILut_default(windowWidth, windowCenter, voiLUT, roundModalityLUTValues) {
  if (voiLUT) {
    return generateNonLinearVOILUT(voiLUT, roundModalityLUTValues);
  }
  return generateLinearVOILUT(windowWidth, windowCenter);
}

// src/internal/generateLut.js
function generateLut_default(image, windowWidth, windowCenter, invert, modalityLUT, voiLUT) {
  const maxPixelValue = image.maxPixelValue;
  const minPixelValue = image.minPixelValue;
  const offset = Math.min(minPixelValue, 0);
  if (image.cachedLut === void 0) {
    const length = maxPixelValue - offset + 1;
    image.cachedLut = {};
    image.cachedLut.lutArray = new Uint8ClampedArray(length);
  }
  const lut = image.cachedLut.lutArray;
  const slopeOrInterceptAreFloat = Boolean(image.slope % 1) || Boolean(image.intercept % 1);
  const mlutfn = getModalityLUT_default(image.slope, image.intercept, modalityLUT);
  const vlutfn = getVOILut_default(windowWidth, windowCenter, voiLUT, slopeOrInterceptAreFloat);
  if (invert === true) {
    for (let storedValue = minPixelValue; storedValue <= maxPixelValue; storedValue++) {
      lut[storedValue + -offset] = 255 - vlutfn(mlutfn(storedValue));
    }
  } else {
    for (let storedValue = minPixelValue; storedValue <= maxPixelValue; storedValue++) {
      lut[storedValue + -offset] = vlutfn(mlutfn(storedValue));
    }
  }
  return lut;
}

// src/internal/computeAutoVoi.js
function computeAutoVoi(viewport, image) {
  if (hasVoi(viewport)) {
    return;
  }
  const maxVoi = image.maxPixelValue * image.slope + image.intercept;
  const minVoi = image.minPixelValue * image.slope + image.intercept;
  const ww = maxVoi - minVoi;
  const wc = (maxVoi + minVoi) / 2;
  if (viewport.voi === void 0) {
    viewport.voi = {
      windowWidth: ww,
      windowCenter: wc
    };
  } else {
    viewport.voi.windowWidth = ww;
    viewport.voi.windowCenter = wc;
  }
}
function hasVoi(viewport) {
  const hasLut = viewport.voiLUT && viewport.voiLUT.lut && viewport.voiLUT.lut.length > 0;
  return hasLut || viewport.voi.windowWidth !== void 0 && viewport.voi.windowCenter !== void 0;
}

// src/rendering/lutMatches.js
function lutMatches_default(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.id === b.id;
}

// src/rendering/getLut.js
function getLut_default(image, viewport, invalidated) {
  if (image.cachedLut !== void 0 && image.cachedLut.windowCenter === viewport.voi.windowCenter && image.cachedLut.windowWidth === viewport.voi.windowWidth && lutMatches_default(image.cachedLut.modalityLUT, viewport.modalityLUT) && lutMatches_default(image.cachedLut.voiLUT, viewport.voiLUT) && image.cachedLut.invert === viewport.invert && invalidated !== true) {
    return image.cachedLut.lutArray;
  }
  computeAutoVoi(viewport, image);
  generateLut_default(image, viewport.voi.windowWidth, viewport.voi.windowCenter, viewport.invert, viewport.modalityLUT, viewport.voiLUT);
  image.cachedLut.windowWidth = viewport.voi.windowWidth;
  image.cachedLut.windowCenter = viewport.voi.windowCenter;
  image.cachedLut.invert = viewport.invert;
  image.cachedLut.voiLUT = viewport.voiLUT;
  image.cachedLut.modalityLUT = viewport.modalityLUT;
  return image.cachedLut.lutArray;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateLut,
  getLut
});
