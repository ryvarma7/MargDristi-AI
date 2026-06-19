module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#06080F',
          surface: '#0C1221',
          elevated: '#111C30'
        },
        border: '#1A2840',
        borderActive: '#2A4080',
        blue: '#1E6FFF',
        blueDim: '#0D3580',
        cyan: '#00C8FF',
        purple: '#9B72FF',
        tier1: '#FF3B3B',
        tier2: '#FF9500',
        tier3: '#00C853',
        text: '#E8EDF5',
        textDim: '#6B7A99',
        textFaint: '#3A4A66'
      }
    }
  },
  plugins: []
};
