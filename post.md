# Documenting the Undocumented

For a while I've wanted to explore Suspense - the feature in react we've all been waiting for!
It's still undocumented (it's for library authors only apparently),
but React 18 brought with it some
[interesting](https://react.dev/blog/2022/03/29/react-v18#new-feature-transitions)
[features](https://react.dev/blog/2022/03/29/react-v18#new-suspense-features),
which look like they could be useful.

In this post I explore those features, and build out an example application which makes use of suspense
(even though I'm not a library author, don't tell the react team) and transitions.

## Setting the Scene

On a recent  project, we were using React and RXJS.
It was a legacy project, just about using React 16.9 and still migrating away from class components towards hooks and function components.

Because a lot of the code was written with class components the only way to bind RXJS into react components was with a HOC.
We needed to write a hook that would do it.
I had a look that the libraries available and couldn't really see any one that stood out as "production ready".
([this](https://react-rxjs.org/) looks like the obvious choice, but it's relatively unpopular and not on a stable version number)
But there's the balance of having another library to update - was it worth taking on another dependency? how much code would I actually be saving?

I thought I'd give it a go, and seeing as how reacts way of handling asynchronous code is this mysterious Suspense thing...
I tried making it suspend.

It was a terrible idea.

I ended up in a loop which I couldn't figure my way out of.
Every time the `Observable` emitted it's first value, the component would resubscribe and suspend again.
It was infuriating.
I ended up throwing that away and doing what I'd done a few times before translating the `Observable` into
a ["Status" object](https://github.com/jaybeeuu/jaybeeuu-dev/blob/main/packages/utilities/src/promise-status.ts) in state,
which let me manually choose whether to display a loading spinner or render something.
When the `Observable` emitted I could update state and so cause rerenders.
It worked fine and let me move on.
But I wasn't satisfied.

Time to simplify things and bring it back to basics.

## So what is suspense any way?

Well... the answer to that question is a component.
[`Suspense`](https://react.dev/reference/react/Suspense)
is well documented, it "lets you display a fallback until its children have finished loading".
"Loading" is doing a ot of work there - what does it mean to be loading?
Further down the page it talks about a "component suspends while fetching [data]".

But they never actually tell you what it means to suspend. Grr.

You can see the magic happening in here: <https://codesandbox.io/s/s9zlw3?file=/Albums.js&utm_medium=sandpack>

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

If a react component throws a promise during it's render then it is said to have suspended.
Welcome to the inner sanctum - you are now a Library Author.
`Suspense` essentially catches the promise, and and renders the fallback in it's place.
I'm not sure that it's actually directly in the call stack, but it's a close enough mental model.

That's not so complicated.

Let me pick `use` apart and reimplement it in TypeScript so that we can see what's happening.

```ts
export interface PromisedValueGetter<Value> {
  (): Value;
  promise: Promise<Value>;
}

export interface PendingPromise<Value> extends PromiseLike<Value> {
  status: "pending";
}

export interface RejectedPromise<Value> extends PromiseLike<Value> {
  status: "rejected";
  error: unknown;
}

export interface FulfilledPromise<Value> extends PromiseLike<Value> {
  status: "fulfilled";
  value: Value;
}

export type ObservedPromise<Value> = PendingPromise<Value> | FulfilledPromise<Value> | RejectedPromise<Value>;
```

These types define the possible states of a promise (`ObservedPromise`)

* `pending` - we're waiting for a value (`PendingPromise`)
* `fulfilled`- the promise has resolved to a value (`FulfilledPromise`)
* `rejected` - the promise has rejected and we've caught the error (`RejectedPromise`)

With those states we can define whatwe're going to do based on where the promise is in it's lifecycle:

```ts
export const use = <Value>(promise: Promise<Value>): Value => {
  const observedPromise = isObservedPromise(promise) ? promise : observePromise(promise);

  switch (observedPromise.status) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    case "pending": throw observedPromise;
    case "fulfilled": return observedPromise.value;
    case "rejected": throw observedPromise.error;
  }
};
```

Throw the promise, return the value or throw the error.

The first line on that function decides if we need to observe the promise or if we've already observed it.
Here's what observing it looks like:

```ts
const observePromise = <Value>(promise: PromiseLike<Value>): ObservedPromise<Value> => {
  const observedPromise: ObservedPromise<Value> = Object.assign(promise, { status: "pending" as  const });

  void (async () => {
    try {
      const value = await promise;
      void Object.assign(observedPromise, { status: "fulfilled" as const, value });
    } catch (error) {
      void Object.assign(observedPromise, { status: "rejected" as const, error });
    }
  })();

  return observedPromise;
};
```

The promise starts `pending`.
(I'm using `Object.assign``, because TypeScript is able to build the types properly so I don't have to cast.)
Then we use an
[IIFE](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)
to await the promise.
When it resolves, we assign it the status to`fulfilled` and set a value property.
When it rejects we likewise set the `rejected` status and set the error propert.

So now we have something that looks like a hook (`useBlah`) that returns a `Value`, except it can also throw promises and errors.
Lets look back at the example and see what the react team do with it.

back in [Albums.js](https://codesandbox.io/s/s9zlw3?file=/Albums.js&utm_medium=sandpack)
they simply call it,

```js
const albums = use(fetchData(`/${artistId}/albums`));
```

There's some more magic going on here too, but essentially this boils down to if the albums hav eloaded, we wll retrieve them and can render the component, if not then this component now throws a promise.
In
[`ArtistPage.js`](https://codesandbox.io/s/s9zlw3?file=/ArtistPage.js:93-103&utm_medium=sandpack)
we can see the `Albums` component is surrounded by a `<Suspense>` component:

```jsx
<Suspense fallback={<Loading />}>
  <Albums artistId={artist.id} />
</Suspense>
```

When the albums are loading - `<Albums>` throws a promise, suspense catches it and displays the fallback.
When the promise resolves or rejects, suspense resets and attempts to render again.
If the promise rejected then we throw, and get caught by an error boundary, otherwise react now has synchronous access to the value and can render.

## The bear trap

Easy? Sounds it - but when I tried before with RXJS i got a loop. So where did that come from? We can't have the whole story.

This all looks innocuous. When `<Albums>` get's rendered it fetches data, then throws or retrieves a value.
Fine.

But hang on - it's not using any `useRef` or `useState` - there's no `useMemo`
(although that
[should be used with caution for data fetches and resource management](https://react.dev/reference/react/useMemo#caveats)
).
So on each render of `<Albums>` we are making a new call to `fetchData` and, in theory, getting a new `promise`.

Except, remember our implementation of `use`. In there we mutated the promise, to "observe" it.
(I'm not a fan of that mutation and you can do this without, but it's a bit more code so let's stick to the point...)
If we pass a fresh new never before seen `promise`, then we'd `observePromise` again and be back in the `pending` state, throwing the promise and suspending.

Don't we **need** something to stabilise the `promise` reference, and avoid making network requests over and over? That's where I got to in my RXJS implementation.

Doing that didn't help - it turns out tha `Suspense` doesn't keep the children around. If they Suspend, they get unmounted.
Even if we did use a `useRef` or some more reliable version of `useMemo`, we would *still* get a new `promise` when they
... uh ... reanimated?
because it is an entirely new instance of the component.

Dig Deeper.

What does this `fetchData` thing in the docs example do anyway? From [`data.js`](https://codesandbox.io/s/s9zlw3?file=/data.js:170-316&utm_medium=sandpack)

```js
let cache = new Map();

export function fetchData(url) {
  if (!cache.has(url)) {
    cache.set(url, getData(url));
  }
  return cache.get(url);
}
```

Right. A cache - either we make a request (`getData`) and set it into the cache, or simply retrieve a pre-existing promise (which is subsequently mutated when we observe it).

That gives us our answer.
In my RXJS implementation I was subscribing during my equivalent of `use`. in order to make it work i'd have needed to keep the subscription around somewhere, in an equivalent to this cache.

## So what's it all about?

I think it comes down to that last bit. Unlike other [frameworks](https://crank.js.org/) the react team have shied away form allowing components to be asynchronous.
Instead favouring Synchronous functions as the basci building block. Anything Asynchronous has to be wrapped and converted, historically, using State to signal changes.
