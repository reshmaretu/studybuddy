import { getStroke } from 'perfect-freehand';

/**
 * Converts raw points into a SVG-style path data string
 * providing that "Premium/Ibis Paint" feel.
 */
export const getSvgPathFromStroke = (points: any[]) => {
    if (!points.length) return "";

    const stroke = getStroke(points, {
        size: 8,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
    });

    const d = stroke.reduce(
        (acc, [x, y], i) => {
            if (i === 0) return `M ${x},${y}`;
            return `${acc} L ${x},${y}`;
        },
        ""
    );

    return `${d} Z`;
};
