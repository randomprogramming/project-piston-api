// Trying to replicate Rusts result enum with this, for handling error responses without having to constantly `throw`
type Ok<T = undefined> = { ok: true; value: T };
type Err<E> = { ok: false; error: E };
type Result<T, E> = Ok<T> | Err<E>;

const Ok = <T = undefined>(value?: T): Ok<T> => ({
    ok: true,
    value: value as T,
});
const Err = <E>(error: E): Err<E> => ({ ok: false, error });

export { type Result, Ok, Err };
