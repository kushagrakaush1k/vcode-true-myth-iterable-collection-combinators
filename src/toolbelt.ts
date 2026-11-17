/**
  Tools for working easily with `Maybe` and `Result` *together*... but which do
  not *require* you to use both. If they were in the `true-myth/maybe` or
  `true-myth/result` modules, then importing either would always include the
  other. While that is not usually a concern with bundlers, it *is* an issue
  when using dynamic imports or otherwise doing runtime resolution in a browser
  or similar environment.

  The flip side of that is: importing from *this* module *does* require access
  to both `Maybe` and `Result` modules.

  @module
 */

import Result from './result.js';
import Maybe, * as maybe from './maybe.js';
import type { AnyMaybe, ValueFor } from './maybe.js';
import { curry1 } from './-private/utils.js';

/**
  Transposes a {@linkcode Result} of a {@linkcode Maybe} into a `Maybe` of a
  `Result`.

  | Input         | Output         |
  | ------------- | -------------- |
  | `Ok(Just(T))` | `Just(Ok(T))`  |
  | `Err(E)`      | `Just(Err(E))` |
  | `Ok(Nothing)` | `Nothing`      |

  @param result a `Result<Maybe<T>, E>` to transform to a `Maybe<Result<T, E>>`.
 */
export function transposeResult<T extends {}, E>(result: Result<Maybe<T>, E>): Maybe<Result<T, E>> {
  return result.match({
    Ok: (maybe) =>
      maybe.match({
        Just: (v) => Maybe.just(Result.ok<T, E>(v)),
        Nothing: () => Maybe.nothing(),
      }),
    Err: (e) => Maybe.just(Result.err<T, E>(e)),
  });
}

/**
  Convert a {@linkcode Result} to a {@linkcode Maybe}.

  The converted type will be {@linkcode "maybe".Just Just} if the `Result` is
  {@linkcode "result".Ok Ok} or {@linkcode "maybe".Nothing Nothing} if the
  `Result` is {@linkcode "result".Err Err}; the wrapped error value will be
  discarded.

  @param result The `Result` to convert to a `Maybe`
  @returns      `Just` the value in `result` if it is `Ok`; otherwise `Nothing`
 */
export function toMaybe<T extends {}>(result: Result<T, unknown>): Maybe<T> {
  return result.isOk ? Maybe.just(result.value) : Maybe.nothing();
}

/**
  Transform a {@linkcode Maybe} into a {@linkcode Result}.

  If the `Maybe` is a {@linkcode "maybe".Just Just}, its value will be wrapped
  in the {@linkcode "result".Ok Ok} variant; if it is a {@linkcode
  "maybe".Nothing Nothing}, the `errValue` will be wrapped in the {@linkcode
  "result".Err Err} variant.

  @param errValue A value to wrap in an `Err` if `maybe` is a `Nothing`.
  @param maybe    The `Maybe` to convert to a `Result`.
 */
export function fromMaybe<T extends {}, E>(errValue: E, maybe: Maybe<T>): Result<T, E>;
export function fromMaybe<T extends {}, E>(errValue: E): (maybe: Maybe<T>) => Result<T, E>;
export function fromMaybe<T extends {}, E>(
  errValue: E,
  maybe?: Maybe<T>
): Result<T, E> | ((maybe: Maybe<T>) => Result<T, E>) {
  const op = (m: Maybe<T>) => (m.isJust ? Result.ok<T, E>(m.value) : Result.err<T, E>(errValue));
  return curry1(op, maybe);
}

/**
  Transposes a {@linkcode Maybe} of a {@linkcode Result} into a `Result` of a
  `Maybe`.

  | Input          | Output        |
  | -------------- | ------------- |
  | `Just(Ok(T))`  | `Ok(Just(T))` |
  | `Just(Err(E))` | `Err(E)`      |
  | `Nothing`      | `Ok(Nothing)` |

  @param maybe a `Maybe<Result<T, E>>` to transform to a `Result<Maybe<T>, E>>`.
 */
export function transposeMaybe<T extends {}, E>(maybe: Maybe<Result<T, E>>): Result<Maybe<T>, E> {
  return maybe.match({
    Just: (result) =>
      result.match({
        Ok: (v) => Result.ok(Maybe.just(v)),
        Err: (e) => Result.err(e),
      }),
    Nothing: () => Result.ok(Maybe.nothing()),
  });
}

/**
  Transform the {@linkcode Maybe} into a {@linkcode Result}, using the wrapped
  value as the {@linkcode "result".Ok Ok} value if the `Maybe` is {@linkcode
  "maybe".Just Just}; otherwise using the supplied `error` value for {@linkcode
  "result".Err Err}.

  @template T  The wrapped value.
  @template E  The error type to in the `Result`.
  @param error The error value to use if the `Maybe` is `Nothing`.
  @param maybe The `Maybe` instance to convert.
  @returns     A `Result` containing the value wrapped in `maybe` in an `Ok`, or
               `error` in an `Err`.
 */
export function toOkOrErr<T extends {}, E>(error: E, maybe: Maybe<T>): Result<T, E>;
export function toOkOrErr<T extends {}, E>(error: E): (maybe: Maybe<T>) => Result<T, E>;
export function toOkOrErr<T extends {}, E>(
  error: E,
  maybe?: Maybe<T>
): Result<T, E> | ((maybe: Maybe<T>) => Result<T, E>) {
  const op = (m: Maybe<T>) => (m.isJust ? Result.ok<T, E>(m.value) : Result.err<T, E>(error));
  return maybe !== undefined ? op(maybe) : op;
}

/**
  Transform the {@linkcode Maybe} into a {@linkcode Result}, using the wrapped
  value as the {@linkcode "result".Ok Ok} value if the `Maybe` is {@linkcode
  "maybe".Just Just}; otherwise using `elseFn` to generate the {@linkcode
  "result".Err Err}.

  @template T  The wrapped value.
  @template E  The error type to in the `Result`.
  @param elseFn The function which generates an error of type `E`.
  @param maybe  The `Maybe` instance to convert.
  @returns     A `Result` containing the value wrapped in `maybe` in an `Ok`, or
               the value generated by `elseFn` in an `Err`.
 */
export function toOkOrElseErr<T extends {}, E>(elseFn: () => E, maybe: Maybe<T>): Result<T, E>;
export function toOkOrElseErr<T extends {}, E>(elseFn: () => E): (maybe: Maybe<T>) => Result<T, E>;
export function toOkOrElseErr<T extends {}, E>(
  elseFn: () => E,
  maybe?: Maybe<T>
): Result<T, E> | ((maybe: Maybe<T>) => Result<T, E>) {
  const op = (m: Maybe<T>) => (m.isJust ? Result.ok<T, E>(m.value) : Result.err<T, E>(elseFn()));
  return curry1(op, maybe);
}

/**
  Construct a {@linkcode "maybe".Maybe Maybe<T>} from a
  {@linkcode "result".Result Result<T, E>}.

  If the `Result` is a {@linkcode "result".Ok Ok}, wrap its value in {@linkcode
  "maybe".Just Just}. If the `Result` is an {@linkcode "result".Err Err}, throw
  away the wrapped `E` and transform to a {@linkcode "maybe".Nothing Nothing}.

  @template T  The type of the value wrapped in a {@linkcode "result".Ok Ok} and
    therefore in the {@linkcode "maybe".Just Just} of the resulting `Maybe`.
  @param result The `Result` to construct a `Maybe` from.
  @returns      `Just` if `result` was `Ok` or `Nothing` if it was `Err`.
 */
export function fromResult<T extends {}>(result: Result<T, unknown>): Maybe<T> {
  return result.isOk ? Maybe.just(result.value) : Maybe.nothing<T>();
}

/**
  Sequence an `Iterable` of {@linkcode Maybe}s into a {@linkcode Result} of an
  array of unwrapped values, converting the first {@linkcode "maybe".Nothing Nothing}
  encountered into an {@linkcode "result".Err Err(errValue)} without pulling
  any further items.

  Takes `(errValue, maybes)`, or just `(errValue)` for the curried version.
 */
export function sequenceMaybeAsResult<T extends {}, E>(
  errValue: E,
  maybes: Iterable<Maybe<T>>
): Result<T[], E>;
export function sequenceMaybeAsResult<R extends AnyMaybe, E>(
  errValue: E,
  maybes: Iterable<R>
): Result<Array<ValueFor<R>>, E>;
export function sequenceMaybeAsResult<E, T extends {} = never>(
  errValue: E
): <T2 extends {} = T>(maybes: Iterable<Maybe<T2>>) => Result<T2[], E>;
export function sequenceMaybeAsResult<T extends {}, E>(
  errValue: E,
  maybes?: Iterable<Maybe<T>>
): Result<T[], E> | ((maybes: Iterable<Maybe<T>>) => Result<T[], E>) {
  const op = (items: Iterable<Maybe<T>>): Result<T[], E> =>
    fromMaybe(errValue, maybe.sequence(items));
  return curry1(op, maybes);
}

/**
  Traverse an `Iterable` with a function returning {@linkcode Maybe}, producing
  a {@linkcode Result} of the array of unwrapped values or short-circuiting with
  {@linkcode "result".Err Err(errValue)} on the first {@linkcode "maybe".Nothing Nothing}
  without pulling any further items.

  Takes `(errValue, items, fn)`, or just `(errValue)` to get back a function
  that takes `(items, fn)`.
 */
export function traverseMaybeAsResult<T, U extends {}, E>(
  errValue: E,
  items: Iterable<T>,
  fn: (item: T) => Maybe<U>
): Result<U[], E>;
export function traverseMaybeAsResult<T, R extends AnyMaybe, E>(
  errValue: E,
  items: Iterable<T>,
  fn: (item: T) => R
): Result<Array<ValueFor<R>>, E>;
export function traverseMaybeAsResult<E, T = never, U extends {} = never>(
  errValue: E
): <T2 = T, U2 extends {} = U>(
  items: Iterable<T2>,
  fn: (item: T2) => Maybe<U2>
) => Result<U2[], E>;
export function traverseMaybeAsResult<T, U extends {}, E>(
  errValue: E,
  items?: Iterable<T>,
  fn?: (item: T) => Maybe<U>
): Result<U[], E> | ((items: Iterable<T>, fn: (item: T) => Maybe<U>) => Result<U[], E>) {
  const op = (iter: Iterable<T>, mapFn: (item: T) => Maybe<U>): Result<U[], E> =>
    fromMaybe(errValue, maybe.traverse(iter, mapFn));
  return items !== undefined ? op(items, fn!) : op;
}

/**
  Combine two {@linkcode Maybe} instances into a {@linkcode Result} of a tuple
  `[T, U]` if both are {@linkcode "maybe".Just Just}, or
  {@linkcode "result".Err Err(errValue)} if either is {@linkcode "maybe".Nothing Nothing}.

  Takes `(errValue, first, second)`, or just `(errValue)` to get back a function
  that takes `(first, second)`.
 */
export function zipMaybeAsResult<T extends {}, U extends {}, E>(
  errValue: E,
  first: Maybe<T>,
  second: Maybe<U>
): Result<[T, U], E>;
export function zipMaybeAsResult<E, T extends {} = never, U extends {} = never>(
  errValue: E
): <T2 extends {} = T, U2 extends {} = U>(
  first: Maybe<T2>,
  second: Maybe<U2>
) => Result<[T2, U2], E>;
export function zipMaybeAsResult<T extends {}, U extends {}, E>(
  errValue: E,
  first?: Maybe<T>,
  second?: Maybe<U>
): Result<[T, U], E> | ((first: Maybe<T>, second: Maybe<U>) => Result<[T, U], E>) {
  const op = (a: Maybe<T>, b: Maybe<U>): Result<[T, U], E> =>
    fromMaybe(errValue, maybe.zip(a, b));
  return first !== undefined ? op(first, second!) : op;
}
