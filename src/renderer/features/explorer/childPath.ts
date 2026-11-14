/** Relative path of `name` inside folder `dir` ("" is the root). */
export function childPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}
