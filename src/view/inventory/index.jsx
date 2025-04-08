import React from 'react'
import Blank from './blank'
import {Container, Col, Row} from "react-bootstrap";

const seedWidth = 60;
const smallWidth = 90;
const medWidth = 100;
const largeWidth = 120;

const row1 = [
    {val: 1, width: seedWidth},
    {val: 1, width: seedWidth},
    {val: 1, width: seedWidth},
    {val: 1, width: seedWidth},
]
const row2 = [
    {val: 2, width: smallWidth},
    {val: 2, width: smallWidth},
    {val: 3, width: smallWidth},
    {val: 3, width: smallWidth},
]
const row3 = [
    {val: 3, width: medWidth},
    {val: 3, width: medWidth},
    {val: 4, width: medWidth},
]
const row4 = [
    {val: 4, width: largeWidth},
    {val: 5, width: largeWidth},
]


export default () => {
    return <Container>
        <Row>
            {row1.map((r) => {
                return <Col>
                    <Blank val={r.val} width={r.width}/>
                </Col>
            })}
        </Row>
        <Row>
            {row2.map((r) => {
                return <Col>
                    <Blank val={r.val} width={r.width}/>
                </Col>
            })}
        </Row>
        <Row>
            {row3.map((r) => {
                return <Col>
                    <Blank val={r.val} width={r.width}/>
                </Col>
            })}
        </Row>
        <Row>
            {row4.map((r) => {
                return <Col>
                    <Blank val={r.val} width={r.width}/>
                </Col>
            })}
        </Row>
    </Container>
}