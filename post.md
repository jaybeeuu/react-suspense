# React Suspense: Documenting the Undocumented

For a while I've wanted to explore Suspense. I read a react blog post way back in 2019 about
[building great UX with React Suspense](https://legacy.reactjs.org/blog/2019/11/06/building-great-user-experiences-with-concurrent-mode-and-suspense.html).
I remember it giving me a real aha moment.
That difference between the waterfall approach to loading data and what i had seen before, loading data as part of the render cycle sounded nothing short of miraculous.
I immediately started to build delays in to my loading spinners to reduce "flicker" and improve the feel of my applications.
And eagerly awaited the arrival of the API in production ready state (it was experimental in react 16).

But that day never arrived, and there was a little note at the beginning of that post which always niggled...

> This post will be most relevant to people working on data fetching libraries for React.

I remember feeling slightly patronised by that.
Why can't I as an application author, become master of my own destiny and make use of this powerful feature?
Was it too complex for mere mortals to comprehend?
Besides this, the only thing it was actually supported for was `Lazy` components,
and I never like using experimental API's in production.
I was put off and lost interest.

Years later the react team announced some
really [interesting](https://react.dev/blog/2022/03/29/react-v18#new-feature-transitions)
[features](https://react.dev/blog/2022/03/29/react-v18#new-suspense-features) in v18,
Which sound like they were the result of totally revolutionising how react works internally
(concurrent rendering - multiverse theory for react applications?).

But while suspense is now "Stable" and "Production Ready" it is only recommended for use in
[data fetching frameworks](https://react.dev/blog/2022/03/29/react-v18#suspense-in-data-frameworks).
And the docs still don't describe how to make suspense work, only how to make use of it with things like `Suspense` and `useTransition`.

They talk about what happens when a component "Suspends", but not how one actually does suspend.

Come on!

What the react authors don't know is that in the intervening years I have become a
[data fetching library author](https://www.npmjs.com/package/@jaybeeuu/recoilless).
So i think it's time to exercise my prerogatives.

In this post I'm going to investigate `Suspense`, and how to make components suspend and how to work with them.
Let's see if I can sneak you in with my backstage pass shall we?

## So what is Suspense any way?

Well... the answer to that question is a component.
[`Suspense`](https://react.dev/reference/react/Suspense)
is well documented, it "lets you display a fallback until its children have finished loading".
"Loading" is doing a ot of work there - what does it mean to be loading?
Further down the page it talks about how a "component suspends while fetching [data]".

But still no mention of actually how to make a component suspend.

I dug into one of their examples to see if there were any answers there.
[This example](https://codesandbox.io/s/s9zlw3?file=/index.js&utm_medium=sandpack),
from
[the suspense docs usage section](https://react.dev/reference/react/Suspense#usage)
is really simple. It displays a button, which you can click to display album data.And shows all the key features we're interested in.
It makes a fake request to get the data, then displays it. In between it shows a loading spinner.

![The beatles](./the-beatles.gif)

It's simple enough that we can see all the moving parts, and they haven't used a library... so...

There it is, under yet another note telling me, please, not to look behind the curtain (sorry Oz...)...

```jsx
function ArtistPage({ artist }) {
  return (
    <>
      <h1>{artist.name}</h1>
      <Suspense fallback={<Loading />}>
        <Albums artistId={artist.id} />
      </Suspense>
    </>
  );
}

function Loading() {
  return <h2>🌀 Loading...</h2>;
}

function Albums({ artistId }) {
  const albums = use(fetchData(`/${artistId}/albums`));
  return (
    <ul>
      {albums.map(album => (
        <li key={album.id}>
          {album.title} ({album.year})
        </li>
      ))}
    </ul>
  );
}
```

Three components, one, `ArtistPage` which uses `Suspense` to display a fallback (`loading`) if it's children (`Albums`) suspends.
[`use`](https://codesandbox.io/s/s9zlw3?file=/Albums.js&utm_medium=sandpack)
must be the place where the magic happens, we find answers in there:

```js
function use(promise) {
  if (promise.status === 'fulfilled') {
    return promise.value;
  } else if (promise.status === 'rejected') {
    throw promise.reason;
  } else if (promise.status === 'pending') {
    throw promise;
  } else {
    promise.status = 'pending';
    promise.then(
      result => {
        promise.status = 'fulfilled';
        promise.value = result;
      },
      reason => {
        promise.status = 'rejected';
        promise.reason = reason;
      },
    );
    throw promise;
  }
}
```

See at the end - they `throw promise` as if it were an error.

That's suspending.
I feel like I should add a line to the docs:

> If a react component throws a promise during it's render then it is said to have suspended.

Welcome to the inner sanctum.
`Suspense` essentially catches the promise, and and renders the fallback in it's place.
I'm not sure whether or not it's actually directly in the call stack, I suspect there's more of an event model at play like with `Error BOundaries`,
but it's a close enough mental model.

Let me pick `use` apart a bit and refactor it so that we can see what's happening.

```js
export const use = (promise) => {
  observePromise(promise);

  switch (promise.status) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    case "pending": throw promise;
    case "fulfilled": return promise.value;
    case "rejected": throw promise.error;
  }
};
```

The first line on that function we "observe" the promise. Here's what that looks like:

```js
const observePromise = (promise) => {
  if (isObservedPromise(promise)) {
    return;
  }

  promise.status = "pending";

  void (async () => {
    try {
      promise.value = await promise;
      promise.status = "fulfilled";
    } catch (error) {
      promise.error = error;
      promise.status = "rejected";
    }
  })();
};
```

If we've already observed then just return, there's nothing to do.
Otherwise there's a bit of mutation (I'm biting my tongue - this  is an example after all) going on to assign statuses and values etc. into properties on the promise.

The promise starts in `pending`.
Then we use an asynchronous
[IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)
to `await` the promise.
When it resolves, we assign it the status to`fulfilled` and set a value property on the promise.
When it rejects we likewise set the `rejected` status and set the error property.

Back in `use` now,  we're up to the `switch/case`, where we decide how to handle what we have.
Those lines again so you don't need to scroll:

```tsx
  switch (observedPromise.status) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    case "pending": throw observedPromise;
    case "fulfilled": return observedPromise.value;
    case "rejected": throw observedPromise.error;
  }
```

You can see us handling each of the three states a promise can be in:

* `"pending"` - we're still waiting fo r a value, throw the promise.
* `"fulfilled"` - we've got a value, return it synchronously.
* `"rejected"` - the promise rejected and we throw the error.

So that's use. Back in [Albums.js](https://codesandbox.io/s/s9zlw3?file=/Albums.js&utm_medium=sandpack)
we can see it in the context of a react component. There they simply call it passing a promise they got from `fetchData()` (a simulated API call),

```js
const albums = use(fetchData(`/${artistId}/albums`));
```

To belabour the point: there's three outcomes of that call.

* thrown error (which we'd expect to be caught to an [error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)),
* thrown promise (the component "suspends") caught by the `Suspense` in `ArtistPage`, which falls back to the `Loading` component.
* the value - allows the component to render.

## How do we... uh... reanimate?

How do we let react know when the promise has fulfilled so it can have another try?
That bit is simple and, maybe, unsurprising.
`Suspense` awaits the promise we throw and then attempts to render again when it resolves.
A little experimentation with throwing other promises confirms that - if you return a promise that never resolves for example then suspense never retries the render.
Interestingly if the promise you throw doesn't resolve a value or resolves to an unrelated value, the component still renders properly... more on that later.

## The bear trap

Easy? Sounds it - but, I'm going to let you into a secret - I've tried writing this before.
I needed a hook to bind RXJS Observables into react and thought I might try using Suspense.
I got in a horrible loop.
That experience, was in part, motivation or investigating this further.
There's something extra that we need to make it all work and that's a little hidden in this example.

Have a look again at `<Albums>`.
WHen it is rendered, it uses `fetchData`, which returns the promise that is passed to `use`.
Fine.

The problem is that we need to have seen the promise before - remember at th beginning of `observePromise`

```ts
if (isObservedPromise(promise)) {
  return promise;
}
```

If the promise has already been observed then simply return it. But that means we need to have seen this instance of a promise before.
Otherwise we're back to pending mode ,and we'll suspend - that could be a loop.

But we're making a bare call to `fetchData` there's no  `useRef` or `useMemo`
(although that
[should be used with caution for data fetches and resource management](https://react.dev/reference/react/useMemo#caveats)
).
So on each render of `<Albums>` we are making a new call to `fetchData` and, on first glance, getting a new `promise`.

Which means we can't possibly pass an observed promise into `use` and so should always suspend?
Don't we **need** something to stabilise the `promise` reference, and avoid making network requests over and over?
This was the cause of my loop in the RXJS binging. On each render, I subscribed to the observable again and ended up in a loop.
My default reaction was to use `useRef` to stabilise the subscription. but that didn't help.
It turns out no hook can help us here.
When a component suspends, it is removed from the tree.
When the promise resolves, and `Suspense` rerenders - it starts from scratch - with an entirely new instance of the child component.
This is mentioned in the [`Suspense`](https://react.dev/reference/react/Suspense#caveats) docs:

> React does not preserve any state for renders that got suspended before they were able to mount for the first time.
> When the component has loaded, React will retry rendering the suspended tree from scratch.

Remember how i said that the value the promise resolves to don't matter?
This is why.
`Suspense` doesn't pass the value back in it just rerenders the whole component.

Let's have another look at `fetchData`, maybe there's answers in there. From [`data.js`](https://codesandbox.io/s/s9zlw3?file=/data.js:170-316&utm_medium=sandpack)

```js
let cache = new Map();

export function fetchData(url) {
  if (!cache.has(url)) {
    cache.set(url, getData(url));
  }
  return cache.get(url);
}
```

Right - a cache.
Either, the cache doesn't have a record for our URL, so we make a request (`getData`) and set the promise into the cache,
or we simply retrieve a pre-existing promise (which is subsequently mutated when we observe it).
So long as the URL is the same we get the same promise, regardless of the caller and for the lifetime of the application.

Great - there's a second line we need to add to our documentation:

> Manage your data fetches outside of the lifecycle and state of the suspended component.

You can't rely on React to state and component lifecycle to entirely manage your data fetches.
Maybe you can trigger them with a render, as is done here, but something else needs to track them and play them back when they resolve.
That can't quite be aa simple Map - in a production application that would be a memory leak
\- something has to come along and tidy up that map when we no longer need the promise, otherwise it would be there forever.

Here we're finally at something which is tricky, and thar be dragons.
Managing a cache like this is notoriously difficult.

When should we remove that promise from the map?
do it too soon and your application won't work, in our case we could end up in cycles, do it too late and you end up with a huge memory footprint.
In our case the component which triggered the fetch in the first place can't be used to manage cleanup either.
For example, we could add some clean up logic to a `useEffect`, but then when would it get called?
A little experimentation indicates it *doesn't* get called when the component suspends, even if it's set up before the component suspended.
But it also doesn't get called if the component *never get's rerendered*.
For example if something in the application changes before the promise resolves, and `Albums` is never rerendered by suspense, then we never get that `useEffect` cleanup.
(Effects are not called if a component suspends, so we don't need to worry about untidied effects, it's just not useful to us.)

Libraries like [`@tanstack/react-query`](https://tanstack.com/query/latest/docs/react/overview) do this for us, with declared timeouts and cache lengths that we can configure.
So maybe it makes sense that the react team are pushing for us not to try and work with `Suspense` directly.
It could lead us into some dangerous territory and as an application developer I want to be writing features, not caching mechanisms.

On the other hand - It turns out that a cache like this isn't necessarily what's required.
In a [(very) slightly more complicated example application](https://github.com/jaybeeuu/react-suspense)
I managed to stabilise the promise by simply by having the promise managed by hooks in a wrapper, between the `Suspense` and the component that needed the data.
The down side here being separating the creation of the data from the need for the data.
Depending on your application that could lead to it's own complexities.

At first all of this seems like a weakness in the design, but having played with it a little.
I actually think it lends some power of `Suspense`.
Remember one of the goals of suspense is to avoid waterfalls of data fetching, sat behind renders.
That need to manage the promise outside the component means you're forced into separating render from fetch,
and therefore into the mindset that data and render are separate.
Looking at the docs, the react team are
[expecting and hoping for just that](https://legacy.reactjs.org/blog/2019/11/06/building-great-user-experiences-with-concurrent-mode-and-suspense.html#fetch-in-event-handlers).
Preparatatory calls to be made at the top level when transitional state changes are made, e.g. in the click handlers of links in routing libraries.
So that by the time the components are being rendered, the data they need is already being fetched.

My container sidestepped some of that advantage of course,
the conatainer wasn't that far from the component,
but maybe that's ok in some use cases.
The simplicity of having an operation declared and managed close to it's point of use, rather than off in some links prepare function,
might well be a desirable tradeoff depending on the scale of your application.
Certainly some of the applications I have worked on, have been so large and complicated that it would take some very delicate architecture to separate data fetch from render meaningfully, without creating a horrible tangle.

## So where does that leave us?

We've figured out how to make suspense work:

> * If a react component throws a promise during it's render then it is said to have suspended.
> * Manage your promises, e.g. for data fetching, outside of the lifecycle and state of the suspended component.

Overall I think suspense is an interesting approach to the problem of asynchrony in applications, and what to display in the meantime.
The way the React team have implemented it makes the actual use of that asynchrony nicely declarative,abstracting away a lot of that decision making form the application developers and presenting a decent base UX.
In combination with
[transitions](https://react.dev/blog/2022/03/29/react-v18#new-feature-transitions)
it's a powerful tool.

There's still a question about whether it's a good idea to use it bare like this, especially in the face of all the react team's encouragement not to do so.
It's stable and "allowed" for ["data fetching in opinionated libraries"](https://react.dev/blog/2022/03/29/react-v18#suspense-in-data-frameworks).

I'm also left wondering if it's not a little too clever for it's own good.
Much like hooks it feels like the learning curve is going to be steep, especially for those new to React, with plenty of pitfalls, bear traps and footguns for folk to discover along the way.
Would it have been needed if the React authors had leaned into more of
[JavaScripts built in features](https://crank.js.org/) rather than being caught up by the [experimental frontiers](https://overreacted.io/algebraic-effects-for-the-rest-of-us/) that the language has yet to catchup with?
Maybe that's why the react team only really want libraries to adopt it?
Their worried that it would confuse the general populace?
Best to hide the magic behind a library call so we don't have to look at it?

Either way - it's here to stay and they do mention th epossibility of introducing more primitives to lubricate it's use in the future...
