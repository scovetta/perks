import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
import * as assert from "assert";
import { Deduplicator } from "../main";
import * as datastore from '@microsoft.azure/datastore';
import * as aio from "@microsoft.azure/async-io";

@suite class DeduplicatorTest {

  @test async "components and paths deduplication"() {

    const input = JSON.parse(await aio.readFile(`${__dirname}/../../test/resources/input.json`));
    const expectedOutput = JSON.parse(await aio.readFile(`${__dirname}/../../test/resources/output.json`));

    // TODO: test mappings.
    const deduplicator = new Deduplicator(input);
    assert.deepStrictEqual(await deduplicator.getOutput(), expectedOutput);
  }
}