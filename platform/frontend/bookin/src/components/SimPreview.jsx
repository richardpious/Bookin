import { CodeEditor } from './CodeEditor';

export const SimPreview = ({ data }) => {
  // SimPreview no longer needs to be a wrapper; CodeEditor handles the content directly
  // We can just render the CodeEditor component if we want to reuse it,
  // but since MainContentWindow now handles it, this file might become redundant.
  return null;
};

