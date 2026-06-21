function cgptGetCodeBlockState(pre) {
  if (!pre) return null;
  if (!pre.__cgptCodeBlockState || typeof pre.__cgptCodeBlockState !== "object") {
    pre.__cgptCodeBlockState = {
      saveButton: null,
      buttonContainer: null,
      buttonOverlayOffset: null,
      viewButtons: null,
      pathInfo: null,
      pathMetadataNode: null,
      generatedFilePath: "",
    };
  }
  return pre.__cgptCodeBlockState;
}

function cgptPatchCodeBlockState(pre, patch = {}) {
  const state = cgptGetCodeBlockState(pre);
  if (!state) return null;
  Object.assign(state, patch);
  return state;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cgptGetCodeBlockState,
    cgptPatchCodeBlockState,
  };
}
