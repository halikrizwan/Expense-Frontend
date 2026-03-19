jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const Icon = props => React.createElement('Icon', props, props.children);
  Icon.loadFont = jest.fn(() => Promise.resolve());

  return {
    __esModule: true,
    default: Icon,
  };
});

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  },
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp',
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');

  const AnimatedView = props => React.createElement('View', props, props.children);
  const animatedComponent = Component => Component;

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: animatedComponent,
    },
    View: AnimatedView,
    createAnimatedComponent: animatedComponent,
    useSharedValue: value => ({ value }),
    useAnimatedStyle: updater => updater(),
    withTiming: value => value,
    FadeInDown: {
      duration: () => ({}),
    },
  };
});
