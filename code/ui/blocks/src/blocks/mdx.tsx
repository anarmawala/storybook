import type { FC, SyntheticEvent } from 'react';
import React, { useContext } from 'react';
import { NAVIGATE_URL } from '@storybook/core-events';
import { Code, components, nameSpaceClassNames } from '@storybook/components';
import { global } from '@storybook/global';
import { styled } from '@storybook/theming';
import { Source } from '../components';
import type { DocsContextProps } from './DocsContext';
import { DocsContext } from './DocsContext';

const { document } = global;

// Hacky utility for asserting identifiers in MDX Story elements
export const assertIsFn = (val: any) => {
  if (typeof val !== 'function') {
    throw new Error(`Expected story function, got: ${val}`);
  }
  return val;
};

// Hacky utility for adding mdxStoryToId to the default context
export const AddContext: FC<DocsContextProps> = (props) => {
  const { children, ...rest } = props;
  const parentContext = React.useContext(DocsContext);
  return (
    <DocsContext.Provider value={{ ...parentContext, ...rest }}>{children}</DocsContext.Provider>
  );
};

interface CodeOrSourceMdxProps {
  className?: string;
}

export const CodeOrSourceMdx: FC<CodeOrSourceMdxProps> = ({ className, children, ...rest }) => {
  // markdown-to-jsx does not add className to inline code
  if (
    typeof className !== 'string' &&
    (typeof children !== 'string' || !(children as string).match(/[\n\r]/g))
  ) {
    return <Code>{children}</Code>;
  }
  // className: "lang-jsx"
  const language = className && className.split('-');
  return (
    <Source
      language={(language && language[1]) || 'plaintext'}
      format={false}
      code={children as string}
      {...rest}
    />
  );
};

function navigate(context: DocsContextProps, url: string) {
  context.channel.emit(NAVIGATE_URL, url);
}

const A = components.a;

interface AnchorInPageProps {
  hash: string;
}

const AnchorInPage: FC<AnchorInPageProps> = ({ hash, children }) => {
  const context = useContext(DocsContext);

  return (
    <A
      href={hash}
      target="_self"
      onClick={(event: SyntheticEvent) => {
        const id = hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          navigate(context, hash);
        }
      }}
    >
      {children}
    </A>
  );
};

interface AnchorMdxProps {
  href: string;
  target: string;
}

export const AnchorMdx: FC<AnchorMdxProps> = (props) => {
  const { href, target, children, ...rest } = props;
  const context = useContext(DocsContext);

  if (href) {
    // Enable scrolling for in-page anchors.
    if (href.startsWith('#')) {
      return <AnchorInPage hash={href}>{children}</AnchorInPage>;
    }

    // Links to other pages of SB should use the base URL of the top level iframe instead of the base URL of the preview iframe.
    if (target !== '_blank' && !href.startsWith('https://')) {
      return (
        <A
          href={href}
          onClick={(event: SyntheticEvent) => {
            event.preventDefault();
            // use the A element's href, which has been modified for
            // local paths without a `?path=` query param prefix
            navigate(context, event.currentTarget.getAttribute('href'));
          }}
          target={target}
          {...rest}
        >
          {children}
        </A>
      );
    }
  }

  // External URL dont need any modification.
  return <A {...props} />;
};

const SUPPORTED_MDX_HEADERS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

const OcticonHeaders = SUPPORTED_MDX_HEADERS.reduce(
  (acc, headerType) => ({
    ...acc,
    [headerType]: styled(headerType)({
      '& svg': {
        visibility: 'hidden',
      },
      '&:hover svg': {
        visibility: 'visible',
      },
    }),
  }),
  {}
);

const OcticonAnchor = styled.a(() => ({
  float: 'left',
  paddingRight: '4px',
  marginLeft: '-20px',
  // Allow the theme's text color to override the default link color.
  color: 'inherit',
}));

interface HeaderWithOcticonAnchorProps {
  as: string;
  id: string;
  children: any;
}

const HeaderWithOcticonAnchor: FC<HeaderWithOcticonAnchorProps> = ({
  as,
  id,
  children,
  ...rest
}) => {
  const context = useContext(DocsContext);

  // @ts-expect-error (Converted from ts-ignore)
  const OcticonHeader = OcticonHeaders[as];
  const hash = `#${id}`;

  return (
    <OcticonHeader id={id} {...rest}>
      <OcticonAnchor
        aria-hidden="true"
        href={hash}
        tabIndex={-1}
        target="_self"
        onClick={(event: SyntheticEvent) => {
          const element = document.getElementById(id);
          if (element) {
            navigate(context, hash);
          }
        }}
      >
        <svg
          viewBox="0 0 16 16"
          version="1.1"
          width="16"
          height="16"
          aria-hidden="true"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"
          />
        </svg>
      </OcticonAnchor>
      {children}
    </OcticonHeader>
  );
};

interface HeaderMdxProps {
  as: string;
  id: string;
}

export const HeaderMdx: FC<HeaderMdxProps> = (props) => {
  const { as, id, children, ...rest } = props;

  // An id should have been added on every header by the "remark-slug" plugin.
  if (id) {
    return (
      <HeaderWithOcticonAnchor as={as} id={id} {...rest}>
        {children}
      </HeaderWithOcticonAnchor>
    );
  }
  // Make sure it still work if "remark-slug" plugin is not present.
  const Component = as as React.ElementType;
  const { as: omittedAs, ...withoutAs } = props;
  return <Component {...nameSpaceClassNames(withoutAs, as)} />;
};

export const HeadersMdx = SUPPORTED_MDX_HEADERS.reduce(
  (acc, headerType) => ({
    ...acc,
    // @ts-expect-error (Converted from ts-ignore)
    [headerType]: (props: object) => <HeaderMdx as={headerType} {...props} />,
  }),
  {}
);
