function nodeId(block, index) {
  return block.id || `${block.type || "block"}-${index + 1}`;
}

export function buildExpressionLayout({
  blocks,
  mode,
  x,
  startY,
  width,
  gap = 32,
  measure,
  isWide,
}) {
  const columnGap = gap;
  const columnWidth = Math.floor((width - columnGap) / 2);
  const columns = [startY, startY];
  const nodes = [];

  for (const [index, block] of blocks.entries()) {
    const wide = Boolean(isWide(block, mode));
    if (wide) {
      const y = Math.max(...columns);
      const measured = measure(block, width);
      const node = {
        id: nodeId(block, index),
        type: block.type,
        x,
        y,
        width,
        height: measured.height,
        children: [],
        sourceBlockIndex: index,
        column: "full",
        block,
      };
      nodes.push(node);
      const nextY = y + node.height + gap;
      columns[0] = nextY;
      columns[1] = nextY;
      continue;
    }

    const columnIndex = columns[0] <= columns[1] ? 0 : 1;
    const measured = measure(block, columnWidth);
    const node = {
      id: nodeId(block, index),
      type: block.type,
      x: x + columnIndex * (columnWidth + columnGap),
      y: columns[columnIndex],
      width: columnWidth,
      height: measured.height,
      children: [],
      sourceBlockIndex: index,
      column: columnIndex === 0 ? "left" : "right",
      block,
    };
    nodes.push(node);
    columns[columnIndex] += node.height + gap;
  }

  const bottom = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) : startY;
  return {
    mode,
    nodes,
    height: Math.max(0, bottom - startY),
    columnHeights: {
      left: Math.max(startY, columns[0] - gap),
      right: Math.max(startY, columns[1] - gap),
    },
    contentBounds: { x, y: startY, width, height: Math.max(0, bottom - startY) },
  };
}
