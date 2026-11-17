import { describe, expect, expectTypeOf, test } from 'vitest';

import Maybe from 'true-myth/maybe';
import Result from 'true-myth/result';
import {
  transposeResult,
  transposeMaybe,
  toOkOrElseErr,
  toOkOrErr,
  fromResult,
  fromMaybe,
  toMaybe,
  sequenceMaybeAsResult,
  traverseMaybeAsResult,
  zipMaybeAsResult,
} from 'true-myth/toolbelt';

describe('transposeResult', () => {
  test('Ok(Just(T))', () => {
    let result = Result.ok<Maybe<number>, string>(Maybe.just(12));
    let transposed = transposeResult(result);
    expect(transposed).toStrictEqual(Maybe.just(Result.ok(12)));
    expectTypeOf(transposed).toEqualTypeOf<Maybe<Result<number, string>>>();
  });

  test('Ok(Nothing)', () => {
    let result = Result.ok<Maybe<number>, string>(Maybe.nothing<number>());
    let transposed = transposeResult(result);
    expect(transposed).toStrictEqual(Maybe.nothing());
    expectTypeOf(transposed).toEqualTypeOf<Maybe<Result<number, string>>>();
  });

  test('Err(E)', () => {
    let result = Result.err<Maybe<number>, string>('hello');
    let transposed = transposeResult(result);
    expect(transposed).toStrictEqual(Maybe.just(Result.err('hello')));
    expectTypeOf(transposed).toEqualTypeOf<Maybe<Result<number, string>>>();
  });
});

test('`toMaybe`', () => {
  const theValue = 'huzzah';
  const anOk = Result.ok(theValue);
  expect(toMaybe(anOk)).toEqual(Maybe.just(theValue));

  const anErr = Result.err<number, string>('uh uh');
  expect(toMaybe(anErr)).toEqual(Maybe.nothing());
});

test('fromMaybe', () => {
  const theValue = 'something';
  const errValue = 'what happened?';

  const aJust = Maybe.just(theValue);
  const anOk = Result.ok(theValue);
  expect(fromMaybe(errValue, aJust)).toEqual(anOk);

  const aNothing = Maybe.nothing();
  const anErr = Result.err(errValue);
  expect(fromMaybe(errValue, aNothing)).toEqual(anErr);
});

describe('transposeMaybe', () => {
  test('Just(Ok(T))', () => {
    let maybe = Maybe.just(Result.ok<number, string>(12));
    let transposed = transposeMaybe(maybe);
    expect(transposed).toStrictEqual(Result.ok(Maybe.just(12)));
    expectTypeOf(transposed).toEqualTypeOf<Result<Maybe<number>, string>>();
  });

  test('Just(Err(E))', () => {
    let maybe = Maybe.just(Result.err<number, string>('whoops'));
    let transposed = transposeMaybe(maybe);
    expect(transposed).toStrictEqual(Result.err('whoops'));
    expectTypeOf(transposed).toEqualTypeOf<Result<Maybe<number>, string>>();
  });

  test('Nothing', () => {
    let maybe = Maybe.nothing<Result<number, string>>();
    let transposed = transposeMaybe(maybe);
    expect(transposed).toStrictEqual(Result.ok(Maybe.nothing()));
    expectTypeOf(transposed).toEqualTypeOf<Result<Maybe<number>, string>>();
  });
});

test('`toOkOrErr`', () => {
  const theValue = 'string';
  const theJust = Maybe.of(theValue);
  const errValue = { reason: 'such badness' };

  expect(toOkOrErr(errValue, theJust)).toEqual(Result.ok(theValue));
  expect(toOkOrErr(errValue, Maybe.nothing())).toEqual(Result.err(errValue));

  expect(toOkOrErr<string, typeof errValue>(errValue)(theJust)).toEqual(
    toOkOrErr(errValue, theJust)
  );
});

test('`toOkOrElseErr`', () => {
  const theJust = Maybe.of(12);
  const errValue = 24;
  const getErrValue = () => errValue;

  expect(toOkOrElseErr(getErrValue, theJust)).toEqual(Result.ok(12));
  expect(toOkOrElseErr(getErrValue, Maybe.nothing())).toEqual(Result.err(errValue));

  expect(toOkOrElseErr<number, number>(getErrValue)(theJust)).toEqual(
    toOkOrElseErr(getErrValue, theJust)
  );
});

test('`fromResult`', () => {
  const value = 1000;
  const anOk = Result.ok(value);
  expect(fromResult(anOk)).toEqual(Maybe.just(value));

  const reason = 'oh teh noes';
  const anErr = Result.err<number, string>(reason);
  expect(fromResult(anErr)).toEqual(Maybe.nothing());
});

describe('`sequenceMaybeAsResult`', () => {
  test('converts all `Just`s into `Ok` of array and `Nothing` into `Err`', () => {
    let okRes = sequenceMaybeAsResult('missing', [Maybe.just(1), Maybe.just(2)]);
    expectTypeOf(okRes).toEqualTypeOf<Result<number[], string>>();
    expect(okRes).toEqual(Result.ok([1, 2]));

    let errRes = sequenceMaybeAsResult('missing', [Maybe.just(1), Maybe.nothing<number>()]);
    expectTypeOf(errRes).toEqualTypeOf<Result<number[], string>>();
    expect(errRes).toEqual(Result.err('missing'));
  });

  test('curried with only error value', () => {
    let seqWithErr = sequenceMaybeAsResult('missing');
    let okRes = seqWithErr([Maybe.just('a'), Maybe.just('b')]);
    expectTypeOf(okRes).toEqualTypeOf<Result<string[], string>>();
    expect(okRes).toEqual(Result.ok(['a', 'b']));
    expect(seqWithErr([Maybe.nothing<string>()])).toEqual(Result.err('missing'));
  });
});

describe('`traverseMaybeAsResult`', () => {
  const safePositive = (n: number): Maybe<number> => (n > 0 ? Maybe.just(n * 2) : Maybe.nothing());

  test('with error value, items, and function', () => {
    let okRes = traverseMaybeAsResult('non-positive', [1, 2, 3], safePositive);
    expectTypeOf(okRes).toEqualTypeOf<Result<number[], string>>();
    expect(okRes).toEqual(Result.ok([2, 4, 6]));

    let errRes = traverseMaybeAsResult('non-positive', [1, -2, 3], safePositive);
    expectTypeOf(errRes).toEqualTypeOf<Result<number[], string>>();
    expect(errRes).toEqual(Result.err('non-positive'));
  });

  test('curried with only error value', () => {
    let withErr = traverseMaybeAsResult('non-positive');
    let okRes = withErr([1, 2], safePositive);
    expectTypeOf(okRes).toEqualTypeOf<Result<number[], string>>();
    expect(okRes).toEqual(Result.ok([2, 4]));
    expect(withErr([1, 0], safePositive)).toEqual(Result.err('non-positive'));
  });
});

describe('`zipMaybeAsResult`', () => {
  test('with error value and two `Maybe`s', () => {
    let okRes = zipMaybeAsResult('missing', Maybe.just(1), Maybe.just('a'));
    expectTypeOf(okRes).toEqualTypeOf<Result<[number, string], string>>();
    expect(okRes).toEqual(Result.ok([1, 'a']));

    let errRes = zipMaybeAsResult('missing', Maybe.just(1), Maybe.nothing<string>());
    expectTypeOf(errRes).toEqualTypeOf<Result<[number, string], string>>();
    expect(errRes).toEqual(Result.err('missing'));
  });

  test('curried with only error value', () => {
    let zipOrMissing = zipMaybeAsResult('missing');
    let okRes = zipOrMissing(Maybe.just(1), Maybe.just('a'));
    expectTypeOf(okRes).toEqualTypeOf<Result<[number, string], string>>();
    expect(okRes).toEqual(Result.ok([1, 'a']));
    expect(zipOrMissing(Maybe.nothing<number>(), Maybe.just('a'))).toEqual(Result.err('missing'));
  });
});
