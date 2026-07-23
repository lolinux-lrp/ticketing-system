export function trimIncomingEmail(rawText: string): string {
  if (!rawText || !rawText.trim()) return rawText;

  let text = rawText;

  // 1. Strip our outbound delimiter and everything below it
  const delimiter = "--- Please reply above this line ---";
  const delimiterIndex = text.indexOf(delimiter);
  if (delimiterIndex !== -1) {
    text = text.substring(0, delimiterIndex);
  }

  // 2. Strip standard email client quote introductions like "On Jan 1, 2023, person wrote:"
  // Gmail, Apple Mail, etc.
  const onWroteRegex = /^On\s+[\s\S]+?wrote:\s*$/m;
  const onWroteMatch = text.match(onWroteRegex);
  if (onWroteMatch && onWroteMatch.index !== undefined) {
    text = text.substring(0, onWroteMatch.index);
  }

  // 3. Strip Outlook / Exchange headers like "From: ... Sent: ... To: ... Subject: ..."
  // or "-----Original Message-----"
  const originalMessageRegex = /^-+Original Message-+/mi;
  const originalMessageMatch = text.match(originalMessageRegex);
  if (originalMessageMatch && originalMessageMatch.index !== undefined) {
    text = text.substring(0, originalMessageMatch.index);
  }

  const fromHeaderRegex = /^From:\s+.+?$/m;
  const fromHeaderMatch = text.match(fromHeaderRegex);
  if (fromHeaderMatch && fromHeaderMatch.index !== undefined) {
    // Make sure it looks like a quote block (followed by Sent:, To:, or Subject:)
    const subText = text.substring(fromHeaderMatch.index);
    if (/^Sent:\s+/m.test(subText) || /^To:\s+/m.test(subText) || /^Subject:\s+/m.test(subText)) {
      text = text.substring(0, fromHeaderMatch.index);
    }
  }

  // 4. Strip standard email signatures (e.g. "-- " or "_____")
  const signatureRegex = /^--\s*$/m;
  const signatureMatch = text.match(signatureRegex);
  if (signatureMatch && signatureMatch.index !== undefined) {
    text = text.substring(0, signatureMatch.index);
  }

  const underscoreSignatureRegex = /^_{5,}\s*$/m;
  const underscoreSignatureMatch = text.match(underscoreSignatureRegex);
  if (underscoreSignatureMatch && underscoreSignatureMatch.index !== undefined) {
    text = text.substring(0, underscoreSignatureMatch.index);
  }

  // Final trim
  text = text.trim();

  // Safety Fallback: if we accidentally stripped everything, return the original
  if (text.length === 0) {
    return rawText.trim();
  }

  return text;
}
