#!/bin/bash


DIRECTORY=`dirname $0`
echo $DIRECTORY

node_file=$1

echo 'running ' $node_file
cd $DIRECTORY
node $node_file 
