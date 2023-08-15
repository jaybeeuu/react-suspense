# React Suspense and Transitions

This is an experimental repo which i used to explore some unfamiliar (to me) features of react - transitions and suspense.

I had two questions i wanted to answer:

1. How does suspense work?
2. What does the new transition API do?

The app is a simple page that let's you load an image from your local machine. It displays the image in a canvas,
and uses one of the prebuild TensorflowJS models
([mobilenet](https://github.com/tensorflow/tfjs-models/tree/master/mobilenet))
to classify the image in your browser.

Loading and classifying the image are both asynchronous operations, classifications uses the output of te image load and so can't start until image load is complete.

## Run it yourself

This repo uses pnpm ot manage it's dependencies, and Vite to build the app.

Once you have it locally run@

```sh
pnpm install
pnpm start
```

Vite will tell you where it's running the app - by default it should be [http://localhost:5173](http://localhost:5173).

I use TypeScript and CSS modules for the styling, so if you want to make changes to the classes then, in a new shell, run

```sh
pnpm css-modules -w
```

That sets up a watch in `typed-css-codules` and keep the type definitions up to date.
